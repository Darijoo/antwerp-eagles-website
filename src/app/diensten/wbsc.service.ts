import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError } from 'rxjs';

export interface WbscSpeler {
  rugnummer: string;
  naam: string;
  positie: string;
  slagWorp: string;
  geboortejaar?: string;
}

// Let op: We gebruiken deze mapping enkel nog als fallback voor héél oude tabellen.
// De vernieuwde WBSC site (.schedule-item) levert nu zelf de volledige teamnamen inclusief cijfer (bv. "Antwerp Eagles 2").
// Het is cruciaal dat we die cijfers behouden, anders heten alle 4 de senioren teams "Antwerp Eagles" op onze website.
const CLUB_MAPPING: Record<string, { naam: string; locatie: string }> = {
  ANT: { naam: 'Antwerp Eagles', locatie: 'Eagles Field (Wilrijk)' },
  MSG: { naam: 'Mont-Saint-Guibert Phoenix', locatie: 'Mont-Saint-Guibert' },
  BRI: { naam: 'Braine Black Rickers', locatie: 'Braine' },
  BRU: { naam: 'Brussels Kangaroos', locatie: 'Brussel' },
  MER: { naam: 'Merchtem Cats', locatie: 'Merchtem' },
  NAM: { naam: 'Namur Angels', locatie: 'Namen' },
  BOR: { naam: 'Borgerhout Squirrels', locatie: 'Borgerhout' },
  DEU: { naam: 'Deurne Spartans', locatie: 'Deurne' },
  HOB: { naam: 'Hoboken Pioneers', locatie: 'Hoboken' },
  RGR: { naam: 'Royal Greys', locatie: 'Merksem' },
  BBM: { naam: 'Braine Black Marlins', locatie: 'Braine-le-Château' },
  SRG: { naam: 'Seraing Brown Boys', locatie: 'Seraing' },
  LGE: { naam: 'Liège Red Roosters', locatie: 'Luik' },
  GNT: { naam: 'Gent Knights', locatie: 'Gent' },
  WIE: { naam: 'Wielsbeke Pitbulls', locatie: 'Wielsbeke' },
  ZOT: { naam: 'Zottegem Bebops', locatie: 'Zottegem' },
  ZON: { naam: 'Sunville Tigers', locatie: 'Zonhoven' },
  OST: { naam: 'Oostende Piranhas', locatie: 'Oostende' },
  POP: { naam: 'Poperinge Frontliners', locatie: 'Poperinge' },
  BEV: { naam: 'Beveren Lions', locatie: 'Beveren' },
  HEI: { naam: 'Heist Afterburners', locatie: 'Heist-op-den-Berg' },
  WBA: { naam: 'WBA Foxes', locatie: 'Sint-Niklaas' },
  BRA: { naam: 'Braschaat Braves', locatie: 'Brasschaat' },
  CHI: { naam: 'Chicaboos', locatie: 'Stabroek' },
  GRE: { naam: 'Royal Greys', locatie: 'Merksem' },
};

@Injectable({
  providedIn: 'root',
})
export class WbscService {
  private http = inject(HttpClient);

  private haalHtmlOp(doelUrl: string): Observable<string> {
    // Gebruik altijd onze eigen supersnelle Cloud Function!
    // Omdat we CORS in de functie hebben ingesteld, werkt deze ook perfect vanaf localhost.
    const proxyUrl = `https://us-central1-antwerp-eagles-d0a87.cloudfunctions.net/wbscProxy?url=${encodeURIComponent(doelUrl)}`;
    return this.http.get(proxyUrl, { responseType: 'text' }).pipe(
      catchError((err) => {
        console.warn(
          'Cloud Function faalde (mogelijk door rate-limiting van de bond). Automatische fallback gestart...',
        );
        // Als de Cloud Function faalt (CORS of Timeout), gebruik dan direct deze gratis en stabiele proxy
        const fallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(doelUrl)}`;
        return this.http.get(fallbackUrl, { responseType: 'text' });
      }),
    );
  }

  // --- 1. SPELERSLIJST (ROSTER) OPHALEN ---
  haalTeamRosterOp(teamUrl: string): Observable<WbscSpeler[]> {
    return this.haalHtmlOp(teamUrl).pipe(
      map((html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const spelers: WbscSpeler[] = [];
        doc.querySelectorAll('table tbody tr').forEach((rij) => {
          const kolommen = Array.from(rij.querySelectorAll('td')).map((td) =>
            (td.textContent || '').trim().replace(/\s+/g, ' '),
          );
          // Check of we een speler of coach hebben (minimaal 3 kolommen en een naam)
          if (kolommen.length >= 3 && kolommen[1]) {
            spelers.push({
              rugnummer: kolommen[0],
              naam: kolommen[1],
              positie: kolommen[2],
              slagWorp: kolommen[3] || '',
              geboortejaar: kolommen[4] || '',
            });
          }
        });
        return spelers;
      }),
    );
  }

  // --- 2. WEDSTRIJDEN OPHALEN ---
  haalTeamMatchenOp(teamUrl: string): Observable<any> {
    return this.haalHtmlOp(teamUrl).pipe(
      map((html: string) => this.schraapWedstrijdenUitHtml(html)),
    );
  }

  private schraapWedstrijdenUitHtml(html: string): any {
    // Maak een virtueel document aan in het geheugen van de browser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const matchen: any[] = [];

    // Hulpfunctie om de ploeg op te zoeken via de afkorting (Bv 'ANT') óf direct via de volledige naam
    const vindPloeg = (zoekTerm: string) => {
      // 1. Exacte afkorting match
      if (CLUB_MAPPING[zoekTerm]) return CLUB_MAPPING[zoekTerm];
      
      // 2. Zoek op (gedeeltelijke) naam match
      const lowerZoek = zoekTerm.toLowerCase();
      const ploeg = Object.values(CLUB_MAPPING).find((c) => c.naam.toLowerCase().includes(lowerZoek) || lowerZoek.includes(c.naam.toLowerCase()));
      
      return ploeg || { naam: zoekTerm, locatie: 'Uit' };
    };

    // Zoek alle wedstrijdblokken (kalender layout gebruikt .schedule-item, team pagina heeft .game-row)
    let rijen = doc.querySelectorAll('.schedule-item, .game-row');
    if (rijen.length === 0) {
      rijen = doc.querySelectorAll('table tbody tr');
    }

    let wedstrijdDatum = new Date(); // We onthouden de datum voor het geval hij in een apart header-blokje boven de teams staat!

    rijen.forEach((rij) => {
      try {
        const rijTekst = (rij.textContent || '').replace(/\s+/g, ' ').trim();
        const isScheduleItem = rij.classList.contains('schedule-item');

        // --- 1. NIEUWE METHODE VOOR DE WBSC KALENDER LAYOUT (.schedule-item) ---
        if (isScheduleItem) {
          let thuisploeg = '';
          let uitploeg = '';
          let locatie = '';
          let datumStr = '';

          // Teams ophalen (zoekt direct naar de 'schone' tekst, negeert logo's en 'flag')
          const teamInfos = rij.querySelectorAll('.team-info');
          if (teamInfos.length < 2) return;

          teamInfos.forEach((info) => {
            const type = info.querySelector('.dugout')?.textContent?.trim().toLowerCase() || '';
            const naamElement = info.querySelector('p:not([class])');
            const naam = naamElement ? naamElement.textContent?.trim() : '';

            if (type.includes('home')) thuisploeg = naam || '';
            else if (type.includes('visitor') || type.includes('away')) uitploeg = naam || '';
          });

          // Datum, Tijd en Locatie ophalen
          const boxScoreLinkDivs = rij.querySelectorAll('.box-score-link > div');
          if (boxScoreLinkDivs.length >= 2) {
            const leftDivP = boxScoreLinkDivs[0].querySelectorAll('p');
            const rightDivP = boxScoreLinkDivs[1].querySelectorAll('p');
            
            // Haal de volledige locatie uit de linker div (bv "Brasschaat Braves Baseball, Brasschaat")
            if (leftDivP.length >= 2) {
              locatie = leftDivP[1].textContent?.trim() || '';
            }
            
            if (rightDivP.length >= 2) {
              datumStr = rightDivP[1].textContent?.trim() || '';
              // Fallback locatie als de linker div leeg was
              if (!locatie) locatie = rightDivP[0].textContent?.replace(':', '')?.trim() || '';
            }
          }

          let wedstrijdTijd = '14:00';
          let geparsteDatum = new Date();
          const dMatch = datumStr.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})(?:,|\s)*(\d{1,2}:\d{2})/);
          if (dMatch) {
            const [_, dag, maand, jaar, t] = dMatch;
            geparsteDatum = new Date(
              parseInt(jaar, 10),
              parseInt(maand, 10) - 1,
              parseInt(dag, 10),
            );
            wedstrijdTijd = t;
            geparsteDatum.setHours(parseInt(t.split(':')[0], 10), parseInt(t.split(':')[1], 10), 0);
          }

          // Uitslag ophalen
          let uitslag = '';
          const scoreText = rij
            .querySelector('.baseball-score-bug > div:nth-child(2) p')
            ?.textContent?.trim();
          if (scoreText) {
            if (scoreText !== '0 : 0') {
              // WBSC toont de score als "Uitploeg : Thuisploeg" (bv 3 : 23).
              // Wij draaien dit om naar onze standaard "Thuisploeg - Uitploeg" (23 - 3).
              const parts = scoreText.split(':');
              if (parts.length === 2) {
                uitslag = `${parts[1].trim()} - ${parts[0].trim()}`;
              } else {
                uitslag = scoreText.replace(':', '-').replace(/\s+/g, ' ');
              }
            } else {
              if (geparsteDatum.getTime() < new Date().getTime()) {
                uitslag = '0 - 0'; // Match is al gepasseerd, werd écht 0-0
              }
            }
          }

          // Status (Geannuleerd)
          const isGeannuleerd =
            rijTekst.toLowerCase().includes('postponed') ||
            rijTekst.toLowerCase().includes('canceled') ||
            rijTekst.toLowerCase().includes('cancelled');

          if (thuisploeg && uitploeg) {
            // WE LATEN DE CLUB_MAPPING WEG!
            // De WBSC site geeft ons nu prachtig "Antwerp Eagles 2" in plaats van enkel "ANT".
            // Als we CLUB_MAPPING zouden gebruiken, verliest de club de "2" of "3" uitvang de naam, 
            // waardoor alle teams op de site gewoon "Antwerp Eagles" zouden heten.
            
            matchen.push({
              thuisploeg: thuisploeg,
              uitploeg: uitploeg,
              datum: geparsteDatum,
              tijd: wedstrijdTijd,
              locatie: locatie || 'Uit',
              uitslag,
              geannuleerd: isGeannuleerd,
            });
          }
          return; // Stop hier, we hebben de rij succesvol verwerkt via de nieuwe methode!
        }

        // --- 2. OUDE FALLBACK METHODE VOOR TABELLEN / ANDERE PAGINA'S ---

        // 1. Datum filteren
        const datumMatch = rijTekst.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
        if (datumMatch) {
          const dag = parseInt(datumMatch[1], 10);
          const maand = parseInt(datumMatch[2], 10) - 1; // JavaScript maanden zijn 0-11
          const jaar = parseInt(datumMatch[3], 10);
          wedstrijdDatum = new Date(jaar, maand, dag, 14, 0); // Standaard op 14:00
        }

        // Haal de teamnamen eruit
        let teams: string[] = [];

        // Poging 1: WBSC team-name classes
        teams = Array.from(rij.querySelectorAll('.team-name, [class*="team-name"]'))
          .map((el) => (el.textContent || '').trim())
          .filter((t) => t.length > 1);

        // Poging 2: Gewone HTML-links (a-tags)
        if (teams.length < 2) {
          teams = Array.from(rij.querySelectorAll('a[href*="/teams/"]'))
            .map((el) => (el.textContent || '').trim())
            .filter((t) => t.length > 1);
        }

        // Poging 3: Tabel-kolommen (Dit is de redding voor kalender overzichten zonder links!)
        const tds = Array.from(rij.querySelectorAll('td'));
        if (teams.length < 2 && tds.length >= 5) {
          // In WBSC kalenders staan Uit en Thuisploeg vaak in kolom 4 en 5 (index 3 en 4)
          let t1 =
            tds[3].textContent
              ?.trim()
              .replace(/\n/g, '')
              .replace(/\s{2,}/g, ' ') || '';
          let t2 =
            tds[4].textContent
              ?.trim()
              .replace(/\n/g, '')
              .replace(/\s{2,}/g, ' ') || '';

          // Controleer of het geen datums of uitslagen zijn
          if (t1.length > 1 && !/^\d+$/.test(t1) && t2.length > 1 && !/^\d+$/.test(t2)) {
            teams = [t1, t2];
          }
        }

        // Poging 4: Image alt attributen (Vaak gebruikt WBSC logo's in plaats van tekst)
        if (teams.length < 2) {
          const altTeams = Array.from(rij.querySelectorAll('img'))
            .map((img) => img.getAttribute('alt') || '')
            .filter((alt) => alt.length > 2 && !alt.toLowerCase().includes('logo'));
          if (altTeams.length >= 2) {
            teams = [altTeams[0], altTeams[1]];
          }
        }

        // Geen teams gevonden? Dan is het waarschijnlijk alleen een datum-header of een lege rij. Sla deze over!
        if (teams.length < 2) return;
        // Negeer de tabel-header rij (voorkomt dat 'Away' vs 'Home' als wedstrijd wordt opgeslagen)
        if (teams[0].toLowerCase().includes('visitor') || teams[0].toLowerCase().includes('away'))
          return;

        const afkortingUit = teams[0] || 'Onbekend';
        const afkortingThuis = teams[1] || 'Onbekend';

        const uitPloeg = vindPloeg(afkortingUit);
        const thuisPloeg = vindPloeg(afkortingThuis);

        // 2. Tijd filteren (Zoek naar uren/minuten formaat, bv 14:00 of 15:30)
        let wedstrijdTijd = '14:00';
        const tijdMatch = rijTekst.match(/\b(\d{1,2}:\d{2})\b/);
        if (tijdMatch) {
          wedstrijdTijd = tijdMatch[1];
          const [uur, min] = wedstrijdTijd.split(':');
          wedstrijdDatum.setHours(parseInt(uur, 10), parseInt(min, 10));
        }

        // 3. Score filteren
        let score = '';

        // Verwijder tijd, datum en teams uit de string zodat we die getallen (bijv. 12:30 of U12) niet verwarren met de uitslag
        let schoneTekst = rijTekst;
        if (tijdMatch) schoneTekst = schoneTekst.replace(tijdMatch[0], '');
        if (datumMatch) schoneTekst = schoneTekst.replace(datumMatch[0], '');
        teams.forEach((t) => (schoneTekst = schoneTekst.replace(t, '')));

        const scoreMatch = schoneTekst.match(/\b(\d+)\s*[-:]\s*(\d+)\b/);
        if (scoreMatch) {
          if (
            scoreMatch[1] !== '0' ||
            scoreMatch[2] !== '0' ||
            wedstrijdDatum.getTime() < new Date().getTime()
          ) {
            score = `${scoreMatch[1]} - ${scoreMatch[2]}`;
          }
        }

        // 4. Locatie bepalen (Soms wordt er een veld genoemd op de kalender, anders fallback naar thuisploeg)
        let locatie = thuisPloeg.locatie;
        if (tds.length >= 6) {
          const ruweLocatie = tds[5].textContent?.trim();
          if (ruweLocatie && ruweLocatie.length > 2 && ruweLocatie.toLowerCase() !== 'tbd') {
            locatie = ruweLocatie;
          }
        }

        matchen.push({
          thuisploeg: thuisPloeg.naam,
          uitploeg: uitPloeg.naam,
          datum: new Date(wedstrijdDatum), // Maak een kopie, anders krijgen alle matchen dezelfde datum!
          tijd: wedstrijdTijd,
          locatie: locatie,
          uitslag: score,
          geannuleerd:
            rijTekst.toLowerCase().includes('postponed') ||
            rijTekst.toLowerCase().includes('canceled'),
        });
      } catch (err) {
        console.error('Fout bij het parsen van een wedstrijdrij:', err);
      }
    });

    return {
      status: 'Klaar om te synchroniseren!',
      aantalGevonden: matchen.length,
      matchen: matchen,
    };
  }
}
