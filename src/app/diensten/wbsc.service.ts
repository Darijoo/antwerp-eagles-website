import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface WbscSpeler {
  rugnummer: string;
  naam: string;
  positie: string;
  slagWorp: string;
  geboortejaar?: string;
}

// Een 'woordenboek' om de afkortingen van de bond om te zetten naar echte namen en velden!
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
  GRE: { naam: 'Royal Greys', locatie: 'Merksem' }
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
    return this.http.get(proxyUrl, { responseType: 'text' });
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

    // Zoek alle wedstrijdblokken (kalender layout gebruikt .schedule-item, team pagina heeft .game-row)
    let rijen = doc.querySelectorAll('.schedule-item, .game-row');
    if (rijen.length === 0) {
      rijen = doc.querySelectorAll('table tbody tr');
    }

    let wedstrijdDatum = new Date(); // We onthouden de datum voor het geval hij in een apart header-blokje boven de teams staat!

    rijen.forEach((rij) => {
      const rijTekst = (rij.textContent || '').replace(/\s+/g, ' ').trim();

      // 1. Datum filteren
      const datumMatch = rijTekst.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (datumMatch) {
        const dag = parseInt(datumMatch[1], 10);
        const maand = parseInt(datumMatch[2], 10) - 1; // JavaScript maanden zijn 0-11
        const jaar = parseInt(datumMatch[3], 10);
        wedstrijdDatum = new Date(jaar, maand, dag, 14, 0); // Standaard op 14:00
      }

      // Haal de teamnamen eruit
      let teams = Array.from(rij.querySelectorAll('.team-name, [class*="team-name"]')).map((el) => (el.textContent || '').trim());
      
      // Fallback voor kalenderpagina's waar teams soms gewone HTML-links (a-tags) zijn
      if (teams.length < 2) {
        teams = Array.from(rij.querySelectorAll('a[href*="/teams/"]')).map((el) => (el.textContent || '').trim());
      }

      // NIEUWE FALLBACK: Zoek in de ruwe tekst direct naar clubnamen op volgorde van verschijning
      if (teams.length < 2) {
        const alleNamen = Object.values(CLUB_MAPPING).map(c => c.naam);
        const regex = new RegExp(alleNamen.join('|'), 'g');
        const gevonden = rijTekst.match(regex);
        if (gevonden && gevonden.length >= 2) {
          teams = [...new Set(gevonden)].slice(0, 2); // Verwijder eventuele dubbele vermeldingen
        }
      }

      // Geen teams gevonden? Dan is het waarschijnlijk alleen een datum-header of een lege rij. Sla deze over!
      if (teams.length < 2) return;

      const afkortingUit = teams[0] || 'Onbekend';
      const afkortingThuis = teams[1] || 'Onbekend';

      // Hulpfunctie om de ploeg op te zoeken via de afkorting (Bv 'ANT') óf direct via de volledige naam
      const vindPloeg = (zoekTerm: string) => {
        if (CLUB_MAPPING[zoekTerm]) return CLUB_MAPPING[zoekTerm];
        const ploeg = Object.values(CLUB_MAPPING).find(c => c.naam === zoekTerm);
        return ploeg || { naam: zoekTerm, locatie: 'Uit' };
      };

      const uitPloeg = vindPloeg(afkortingUit);
      const thuisPloeg = vindPloeg(afkortingThuis);

      // 2. Tijd filteren (Zoek naar uren/minuten formaat, bv 14:00 of 15:30)
      let wedstrijdTijd = '14:00';
      const tijdMatch = rijTekst.match(/\b(\d{2}:\d{2})\b/);
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
      teams.forEach(t => schoneTekst = schoneTekst.replace(t, ''));

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

      matchen.push({
        thuisploeg: thuisPloeg.naam,
        uitploeg: uitPloeg.naam,
        datum: new Date(wedstrijdDatum), // Maak een kopie, anders krijgen alle matchen dezelfde datum!
        tijd: wedstrijdTijd,
        locatie: locatie,
        uitslag: score,
      });
    });

    return {
      status: 'Klaar om te synchroniseren!',
      aantalGevonden: matchen.length,
      matchen: matchen,
    };
  }
}
