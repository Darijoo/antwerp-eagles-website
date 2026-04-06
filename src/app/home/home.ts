import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // <-- 1. Importeer de ChangeDetectorRef
import { RouterLink } from '@angular/router';
import { NieuwsService, NieuwsBericht } from '../diensten/nieuws';
import { DatePipe, AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { KalenderService, Match } from '../diensten/kalender.service';
import { TeamService } from '../diensten/team';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DatePipe, AsyncPipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private nieuwsService = inject(NieuwsService);
  private cdr = inject(ChangeDetectorRef); // <-- 2. Haal de 'schilder' naar binnen
  private kalenderService = inject(KalenderService);
  private teamService = inject(TeamService);

  teamsKleurMap: Record<string, string> = {};

  laatsteNieuws: NieuwsBericht[] = [];
  aankomendeActiviteiten$: Observable<Match[]>;
  laatsteUitslagen$: Observable<Match[]>;

  constructor() {
    this.aankomendeActiviteiten$ = this.kalenderService.haalAlleWedstrijdenOp().pipe(
      map((matches) => {
        const vandaag = new Date();
        vandaag.setHours(0, 0, 0, 0); // Negeer de tijd, we kijken alleen naar de dag

        return matches
          .filter((m) => m.datum.toDate() >= vandaag) // Bewaar alleen wedstrijden in de toekomst
          .sort((a, b) => a.datum.toDate().getTime() - b.datum.toDate().getTime()) // Sorteer op datum: dichtstbijzijnde eerst
          .slice(0, 3); // Laat maximaal 3 kaartjes tegelijk zien op de homepagina
      }),
    );

    this.laatsteUitslagen$ = this.kalenderService.haalAlleWedstrijdenOp().pipe(
      map((matches) => {
        const vandaag = new Date();
        vandaag.setHours(0, 0, 0, 0); // Negeer de tijd

        return matches
          .filter(
            (m) =>
              (!m.type || m.type === 'wedstrijd') &&
              m.datum.toDate() < vandaag &&
              m.uitslag &&
              m.uitslag.trim() !== '' &&
              !(m as any).geannuleerd,
          )
          .sort((a, b) => b.datum.toDate().getTime() - a.datum.toDate().getTime()) // Sorteer op datum: nieuwste uitslag eerst
          .slice(0, 3); // Maximaal 3 uitslagen tonen
      }),
    );
  }

  ngOnInit() {
    // Haal de teams op om hun specifiek gekozen kalenderkleur te onthouden
    this.teamService.haalAlleTeamsOp().subscribe((teams) => {
      teams.forEach((t) => {
        if (t.naam && t.kleur) {
          this.teamsKleurMap[t.naam] = t.kleur;
        }
      });
      this.cdr.detectChanges(); // <-- Zorgt dat de nieuwe kleuren direct zichtbaar worden!
    });

    this.nieuwsService.haalLaatsteNieuwsOp().subscribe({
      next: (data) => {
        // Sorteer nieuws: nieuwste datum bovenaan
        this.laatsteNieuws = data.sort(
          (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime(),
        );
        this.cdr.detectChanges(); // <-- 3. DWING Angular om de HTML NU opnieuw te tekenen!
      },
      error: (fout) => {
        console.error('Oeps, we konden Strapi niet bereiken:', fout);
      },
    });
  }

  // Genereer een vaste kleur op basis van de letters uit de teamnaam
  getTeamKleur(teamNaam: string): string {
    // Als de beheerder een kleur heeft ingesteld in het admin paneel, gebruik die!
    if (this.teamsKleurMap[teamNaam]) return this.teamsKleurMap[teamNaam];
    if (!teamNaam) return 'var(--eagle-blue)'; // Standaard clubkleur

    let hash = 0;
    for (let i = 0; i < teamNaam.length; i++) {
      hash = teamNaam.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 40%)`; // Donkere, verzadigde kleur voor witte tekst
  }

  // Bepaalt of een wedstrijd een thuismatch is
  isThuisMatch(match: Match): boolean {
    return match.thuisploeg ? match.thuisploeg.toLowerCase().includes('eagle') : false;
  }
}
