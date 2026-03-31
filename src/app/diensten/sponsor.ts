import { Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

export interface Sponsor {
  id: number;
  naam: string;
  websiteUrl?: string;
  afbeeldingUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SponsorService {
  // Hardcoded lijst met sponsors
  private sponsors = signal<Sponsor[]>([
    { id: 1, naam: 'The Cage', websiteUrl: 'https://thecage.be', afbeeldingUrl: '' },
    { id: 2, naam: 'Dog Partner', websiteUrl: 'https://dogpartner.be', afbeeldingUrl: '' },
    { id: 3, naam: 'RSM Belgium', websiteUrl: 'https://www.rsmbelgium.be', afbeeldingUrl: '' },
  ]);

  haalAlleSponsorsOp(): Observable<Sponsor[]> {
    return of(this.sponsors());
  }

  haalSponsorOp(id: number): Observable<Sponsor> {
    const sponsor = this.sponsors().find((s) => s.id === id);
    if (sponsor) {
      return of(sponsor);
    }
    return throwError(() => new Error(`Sponsor met id ${id} niet gevonden`));
  }

  voegSponsorToe(nieuweSponsor: Omit<Sponsor, 'id'>): Observable<Sponsor> {
    const id = Math.max(0, ...this.sponsors().map((s) => s.id)) + 1;
    const sponsorMetId: Sponsor = { ...nieuweSponsor, id };
    this.sponsors.update((sponsors) => [...sponsors, sponsorMetId]);
    return of(sponsorMetId);
  }

  updateSponsor(id: number, gewijzigdSponsor: Omit<Sponsor, 'id'>): Observable<Sponsor> {
    const compleetSponsor: Sponsor = { ...gewijzigdSponsor, id };
    this.sponsors.update((sponsors) => sponsors.map((s) => (s.id === id ? compleetSponsor : s)));
    return of(compleetSponsor);
  }

  verwijderSponsor(id: number): Observable<{}> {
    this.sponsors.update((sponsors) => sponsors.filter((s) => s.id !== id));
    return of({});
  }
}
