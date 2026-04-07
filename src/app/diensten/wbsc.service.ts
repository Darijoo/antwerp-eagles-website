import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface WbscSpeler {
  rugnummer: string;
  naam: string;
  positie: string;
  slagWorp: string;
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
          // Check of we echt een speler-rij hebben (minimaal 5 kolommen en een naam)
          if (kolommen.length >= 5 && kolommen[1]) {
            spelers.push({
              rugnummer: kolommen[0],
              naam: kolommen[1],
              positie: kolommen[2],
              slagWorp: kolommen[3],
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

    // Zoek alle wedstrijdblokken op de pagina!
    const rijen = doc.querySelectorAll('.game-row');

    rijen.forEach((rij) => {
      // Haal de teamnamen eruit (meestal [0] = Uitploeg, [1] = Thuisploeg)
      const teams = Array.from(rij.querySelectorAll('.team-name')).map((el) =>
        (el.textContent || '').trim(),
      );

      const afkortingUit = teams[0] || 'Onbekend';
      const afkortingThuis = teams[1] || 'Onbekend';

      const uitPloeg = CLUB_MAPPING[afkortingUit] || { naam: afkortingUit, locatie: 'Uit' };
      const thuisPloeg = CLUB_MAPPING[afkortingThuis] || { naam: afkortingThuis, locatie: 'Uit' };

      // Haal het uitslag blokje eruit
      const uitslagBlok = rij.querySelector('.game-score, .score');
      const uitslagTekst = uitslagBlok
        ? (uitslagBlok.textContent || '').replace(/\s+/g, ' ').trim()
        : '';

      // 1. Datum filteren
      let wedstrijdDatum = new Date();
      const datumMatch = uitslagTekst.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (datumMatch) {
        const dag = parseInt(datumMatch[1], 10);
        const maand = parseInt(datumMatch[2], 10) - 1; // JavaScript maanden zijn 0-11
        const jaar = parseInt(datumMatch[3], 10);
        wedstrijdDatum = new Date(jaar, maand, dag, 14, 0); // Standaard op 14:00
      }

      // 2. Score filteren (0:0 in de toekomst is 'nog niet gespeeld')
      let score = '';
      const scoreMatch = uitslagTekst.match(/(\d+)\s*:\s*(\d+)/);
      if (scoreMatch) {
        if (
          scoreMatch[1] !== '0' ||
          scoreMatch[2] !== '0' ||
          wedstrijdDatum.getTime() < new Date().getTime()
        ) {
          score = `${scoreMatch[1]} - ${scoreMatch[2]}`;
        }
      }

      matchen.push({
        thuisploeg: thuisPloeg.naam,
        uitploeg: uitPloeg.naam,
        datum: wedstrijdDatum,
        tijd: '14:00', // Tijd wordt helaas niet vermeld in deze blokken
        locatie: thuisPloeg.locatie,
        uitslag: score,
      });
    });

    return {
      status: 'Klaar om te synchroniseren!',
      aantalGevonden: rijen.length,
      matchen: matchen,
    };
  }
}
