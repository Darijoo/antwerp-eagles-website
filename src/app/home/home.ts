import { Component, OnInit, AfterViewChecked, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
export class Home implements OnInit, AfterViewChecked {
  private nieuwsService = inject(NieuwsService);
  private cdr = inject(ChangeDetectorRef); // <-- 2. Haal de 'schilder' naar binnen
  private kalenderService = inject(KalenderService);
  private teamService = inject(TeamService);
  private destroyRef = inject(DestroyRef);

  teamsKleurMap: Record<string, string> = {};

  laatsteNieuws: NieuwsBericht[] = [];
  aankomendWeekend$: Observable<Match[]>;
  weekendUitslagen$: Observable<Match[]>;

  private observer: IntersectionObserver | null = null;
  private viewCheckedTimer: any;

  constructor() {
    this.aankomendWeekend$ = this.kalenderService.haalAlleWedstrijdenOp().pipe(
      map((matches) => {
        const nu = new Date();
        const dagVanWeek = nu.getDay(); // 0=zo, 1=ma, ..., 5=vr, 6=za

        const weekendStart = new Date(nu);
        const weekendEinde = new Date(nu);

        // Komend weekend berekenen
        // Als het al weekend is (vr, za, zo), tonen we DIT weekend.
        // Als het ma-do is, tonen we het EERSTVOLGENDE weekend.
        if (dagVanWeek >= 1 && dagVanWeek <= 4) {
          // Ma t/m do
          const dagenTotVrijdag = 5 - dagVanWeek;
          weekendStart.setDate(nu.getDate() + dagenTotVrijdag);
          weekendEinde.setDate(weekendStart.getDate() + 2);
        } else if (dagVanWeek === 0) {
          // Zondag -> we tonen nog steeds vandaag
          weekendStart.setDate(nu.getDate() - 2);
          weekendEinde.setDate(nu.getDate());
        } else if (dagVanWeek === 5) {
          // Vrijdag
          weekendStart.setDate(nu.getDate());
          weekendEinde.setDate(nu.getDate() + 2);
        } else if (dagVanWeek === 6) {
          // Zaterdag
          weekendStart.setDate(nu.getDate() - 1);
          weekendEinde.setDate(nu.getDate() + 1);
        }

        weekendStart.setHours(0, 0, 0, 0);
        weekendEinde.setHours(23, 59, 59, 999);

        const weekendMatches = matches
          .filter((m) => {
            const d = m.datum.toDate();
            return d >= weekendStart && d <= weekendEinde;
          })
          .sort((a, b) => a.datum.toDate().getTime() - b.datum.toDate().getTime());

        // Fallback: als er geen matchen zijn dit weekend, toon de eerstvolgende 3
        if (weekendMatches.length === 0) {
          return matches
            .filter((m) => m.datum.toDate() >= nu)
            .sort((a, b) => a.datum.toDate().getTime() - b.datum.toDate().getTime())
            .slice(0, 3);
        }

        return weekendMatches;
      }),
    );

    this.weekendUitslagen$ = this.kalenderService.haalAlleWedstrijdenOp().pipe(
      map((matches) => {
        const nu = new Date();

        // Bereken het meest recente weekend:
        // - Vrijdagavond 18:00 t/m zondagnacht 23:59
        // Op maandag t/m donderdag kijken we naar het VORIGE weekend.
        // Op vrijdag t/m zondag kijken we naar DIT weekend.
        const dagVanWeek = nu.getDay(); // 0=zo, 1=ma, ..., 5=vr, 6=za

        const weekendStart = new Date(nu);
        const weekendEinde = new Date(nu);

        if (dagVanWeek >= 1 && dagVanWeek <= 4) {
          // Ma t/m do → vorig weekend
          const dagenTerugNaarVrijdag = dagVanWeek + 2; // vr is dag 5, dus ma=3, di=4, wo=5, do=6
          weekendStart.setDate(nu.getDate() - dagenTerugNaarVrijdag);
          weekendEinde.setDate(weekendStart.getDate() + 2); // zondag
        } else if (dagVanWeek === 5) {
          // Vrijdag → dit weekend
          weekendStart.setDate(nu.getDate());
          weekendEinde.setDate(nu.getDate() + 2);
        } else if (dagVanWeek === 6) {
          // Zaterdag → dit weekend
          weekendStart.setDate(nu.getDate() - 1);
          weekendEinde.setDate(nu.getDate() + 1);
        } else {
          // Zondag → dit weekend
          weekendStart.setDate(nu.getDate() - 2);
          weekendEinde.setDate(nu.getDate());
        }

        weekendStart.setHours(0, 0, 0, 0);
        weekendEinde.setHours(23, 59, 59, 999);

        const weekendMatches = matches
          .filter(
            (m) =>
              (!m.type || m.type === 'wedstrijd') &&
              m.uitslag &&
              m.uitslag.trim() !== '' &&
              !(m as any).geannuleerd,
          )
          .filter((m) => {
            const d = m.datum.toDate();
            return d >= weekendStart && d <= weekendEinde;
          })
          .sort((a, b) => a.datum.toDate().getTime() - b.datum.toDate().getTime());

        // Als er geen uitslagen zijn van het weekend, toon dan de 3 meest recente als fallback
        if (weekendMatches.length === 0) {
          return matches
            .filter(
              (m) =>
                (!m.type || m.type === 'wedstrijd') &&
                m.datum.toDate() < nu &&
                m.uitslag &&
                m.uitslag.trim() !== '' &&
                !(m as any).geannuleerd,
            )
            .sort((a, b) => b.datum.toDate().getTime() - a.datum.toDate().getTime())
            .slice(0, 3);
        }

        return weekendMatches;
      }),
    );
  }

  ngOnInit() {
    // Haal de teams op om hun specifiek gekozen kalenderkleur te onthouden
    this.teamService.haalAlleTeamsOp().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((teams) => {
      teams.forEach((t) => {
        if (t.naam && t.kleur) {
          this.teamsKleurMap[t.naam] = t.kleur;
        }
      });
      this.cdr.detectChanges(); // <-- Zorgt dat de nieuwe kleuren direct zichtbaar worden!
    });

    this.nieuwsService.haalLaatsteNieuwsOp().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        // Sorteer nieuws: nieuwste datum bovenaan
        this.laatsteNieuws = data.sort(
          (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime(),
        ).slice(0, 3); // Laat maximaal 3 nieuwsberichten zien op de homepagina
        this.cdr.detectChanges(); // <-- 3. DWING Angular om de HTML NU opnieuw te tekenen!
      },
      error: (fout) => {
        console.error('Oeps, we konden Strapi niet bereiken:', fout);
      },
    });
  }

  // Deze Angular lifecycle-hook kijkt of er nieuwe elementen (zoals ingeladen uitslagen) op het scherm zijn getekend
  ngAfterViewChecked() {
    clearTimeout(this.viewCheckedTimer);
    this.viewCheckedTimer = setTimeout(() => {
      if (!this.observer) {
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible'); // Zet de animatie in gang!
              this.observer?.unobserve(entry.target); // Speel de animatie maar 1x af
            }
          });
        }, { threshold: 0.15 }); // Start de animatie zodra 15% van het kaartje in beeld is
      }
      document.querySelectorAll('.reveal-on-scroll:not(.is-visible):not(.is-observed)').forEach(el => {
        el.classList.add('is-observed');
        this.observer?.observe(el);
      });
    }, 200);
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

  // Haal alleen de thuis- of uitscore op uit "10 - 5"
  getScore(uitslag: string | undefined, index: number): string {
    if (!uitslag) return '';
    const parts = uitslag.split('-');
    if (parts.length === 2) {
      return parts[index].trim();
    }
    return uitslag; // Fallback als de uitslag geen koppelteken heeft
  }

  isWinnaar(wedstrijd: Match, teamType: 'thuis' | 'uit'): boolean {
    if (!wedstrijd.uitslag) return false;
    const parts = wedstrijd.uitslag.split('-');
    if (parts.length !== 2) return false;
    const scoreThuis = parseInt(parts[0].trim(), 10);
    const scoreUit = parseInt(parts[1].trim(), 10);
    if (isNaN(scoreThuis) || isNaN(scoreUit)) return false;
    
    if (teamType === 'thuis') return scoreThuis > scoreUit;
    if (teamType === 'uit') return scoreUit > scoreThuis;
    return false;
  }

  getWedstrijdResultaat(wedstrijd: Match): 'W' | 'L' | 'T' | '' {
    if (!wedstrijd.uitslag) return '';
    if (this.isWinnaar(wedstrijd, 'thuis') && this.isWinnaar(wedstrijd, 'uit')) return ''; // Kan normaal niet
    const scoreThuis = parseInt(wedstrijd.uitslag.split('-')[0], 10);
    const scoreUit = parseInt(wedstrijd.uitslag.split('-')[1], 10);
    if (scoreThuis === scoreUit) return 'T';

    const thuisIsEagle = this.isThuisMatch(wedstrijd);
    const uitIsEagle = wedstrijd.uitploeg?.toLowerCase().includes('eagle');

    if (thuisIsEagle) return scoreThuis > scoreUit ? 'W' : 'L';
    else if (uitIsEagle) return scoreUit > scoreThuis ? 'W' : 'L';
    return '';
  }
}
