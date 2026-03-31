import { Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

// Simpele interface voor een nieuwsbericht, zonder Strapi-specifieke velden.
export interface NieuwsBericht {
  id: number;
  titel: string;
  datum: string;
  samenvatting: string;
  volledigeText: string;
  afbeeldingUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NieuwsService {
  // We vervangen de Strapi backend met een simpele lijst in het geheugen.
  // Dit is een goede tussenstap. Later kunnen we dit vervangen door een echte database.
  private nieuwsberichten = signal<NieuwsBericht[]>([
    {
      id: 1,
      titel: 'Nieuwe uitrusting voor het komende seizoen',
      datum: '2026-03-25',
      samenvatting:
        'De Antwerp Eagles hebben een nieuwe lading handschoenen, helmen en knuppels ontvangen voor het aankomende seizoen.',
      volledigeText:
        'Dankzij een gulle donatie van onze hoofdsponsor, The Cage, kunnen we met trots aankondigen dat alle teams voorzien zullen worden van gloednieuw materiaal. Dit omvat professionele handschoenen, de nieuwste modellen helmen en een reeks houten en aluminium knuppels.',
      afbeeldingUrl: 'https://images.unsplash.com/photo-1599499431233-532442141468?q=80&w=2070',
    },
    {
      id: 2,
      titel: 'The Cage sponsort Antwerp Eagles',
      datum: '2026-03-28',
      samenvatting:
        'Onze lokale slagkooi "The Cage" heeft een sponsorcontract getekend en wordt de hoofdsponsor voor de komende 3 jaar.',
      volledigeText:
        'Het bestuur is verheugd te kunnen aankondigen dat "The Cage", de favoriete indoor trainingsfaciliteit van veel van onze leden, een driejarig sponsorcontract heeft getekend. Hun logo zal prominent op onze shirts te zien zijn.',
      afbeeldingUrl: 'https://images.unsplash.com/photo-1551773862-2434155ab45c?q=80&w=2070',
    },
    {
      id: 3,
      titel: 'Jeugdteams domineren op vriendschappelijk toernooi',
      datum: '2026-03-15',
      samenvatting:
        'Zowel onze U12 als U15 teams hebben de eerste plaats behaald op het jaarlijkse voorbereidingstoernooi in Gent.',
      volledigeText:
        'Met indrukwekkend slagwerk en solide verdediging lieten onze jeugdteams zien dat ze klaar zijn voor de competitie. De U12 won de finale met 10-2, terwijl de U15 een spannende wedstrijd met 5-4 naar zich toe trok.',
      afbeeldingUrl: 'https://images.unsplash.com/photo-1629114631087-85354b35a10a?q=80&w=2070',
    },
  ]);

  haalLaatsteNieuwsOp(): Observable<NieuwsBericht[]> {
    return of(this.nieuwsberichten());
  }

  haalNieuwsBerichtOp(id: number): Observable<NieuwsBericht> {
    const bericht = this.nieuwsberichten().find((b) => b.id === id);
    if (bericht) {
      return of(bericht);
    }
    return throwError(() => new Error(`Nieuwsbericht met id ${id} niet gevonden`));
  }

  voegNieuwsBerichtToe(nieuwBericht: Omit<NieuwsBericht, 'id'>): Observable<NieuwsBericht> {
    // Zoek het hoogste ID in de huidige lijst en doe +1 (simuleert een database ID)
    const id = Math.max(0, ...this.nieuwsberichten().map((b) => b.id)) + 1;
    const berichtMetId: NieuwsBericht = { ...nieuwBericht, id };
    this.nieuwsberichten.update((berichten) => [berichtMetId, ...berichten]);
    return of(berichtMetId);
  }

  updateNieuwsBericht(
    id: number,
    gewijzigdBericht: Omit<NieuwsBericht, 'id'>,
  ): Observable<NieuwsBericht> {
    const compleetBericht: NieuwsBericht = { ...gewijzigdBericht, id };
    this.nieuwsberichten.update((berichten) =>
      berichten.map((b) => (b.id === id ? compleetBericht : b)),
    );
    return of(compleetBericht);
  }

  verwijderNieuwsBericht(id: number): Observable<{}> {
    this.nieuwsberichten.update((berichten) => berichten.filter((b) => b.id !== id));
    return of({});
  }
}
