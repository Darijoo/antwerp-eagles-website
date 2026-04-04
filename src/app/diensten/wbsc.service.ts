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
  MSG: { naam: 'Mortsel Stars', locatie: 'Mortsel' },
  BRI: { naam: 'Brasschaat Braves', locatie: 'Brasschaat' },
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
  ZOT: { naam: 'Zottegem Frogs', locatie: 'Zottegem' },
  ZON: { naam: 'Sunville Tigers', locatie: 'Zonhoven' },
  OST: { naam: 'Ostend Raccoons', locatie: 'Oostende' },
  POP: { naam: 'Poperinge Spartans', locatie: 'Poperinge' },
  BEV: { naam: 'Beveren Lions', locatie: 'Beveren' },
  HEI: { naam: 'Heist Afterburners', locatie: 'Heist-op-den-Berg' },
  LLN: { naam: 'Louvain-la-Neuve Phoenix', locatie: 'Louvain-la-Neuve' },
  BCC: { naam: 'Braine-le-Château', locatie: 'Braine-le-Château' },
  HAS: { naam: 'Hasselt Pioneers', locatie: 'Hasselt' },
  STV: { naam: 'St. Vith', locatie: 'St. Vith' },
  FLA: { naam: 'Flemalle', locatie: 'Flémalle' },
  BIN: { naam: 'Binche', locatie: 'Binche' },
};

@Injectable({
  providedIn: 'root',
})
export class WbscService {
  private http = inject(HttpClient);

  // --- SLIMME PROXY KIEZER ---
  // Omdat corsproxy.io perfect is lokaal, maar blokkeert op live servers,
  // en allorigins soms hapert lokaal, laten we de code automatisch de beste kiezen!
  private haalHtmlOp(doelUrl: string): Observable<string> {
    const isLocalhost = window.location.hostname === 'localhost';

    if (isLocalhost) {
      // Lokaal testen we via corsproxy.io (geeft direct de pure HTML terug)
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(doelUrl)}`;
      return this.http.get(proxyUrl, { responseType: 'text' });
    } else {
      // Live op de server gebruiken we allorigins (in JSON verpakt)
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(doelUrl)}`;
      return this.http.get(proxyUrl).pipe(map((data: any) => data.contents));
    }
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
