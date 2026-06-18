import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TeamService, Team } from '../diensten/team'; // Onze nieuwe postbode

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './teams.html',
  styleUrl: './teams.scss',
})
export class Teams implements OnInit {
  private teamService = inject(TeamService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private titleService = inject(Title);

  // We maken een lijst (array) aan om alle teams in op te slaan
  alleTeams: Team[] = [];
  isLaden = true; // Gebruikt voor de nieuwe skeleton loaders
  actiefFilter = 'Alle'; // Standaard laten we alles zien

  // Haalt dynamisch alle unieke categorieën (bijv. 'Honkbal', 'Softbal', 'Jeugd') uit je opgeslagen teams
  get categorieen(): string[] {
    const uniekeCategorieen = new Set(this.alleTeams.map(t => t.categorie).filter(Boolean));
    return ['Alle', ...Array.from(uniekeCategorieen).sort()];
  }

  // De lijst die de HTML mag tekenen, gefilterd op de actieve knop
  get gefilterdeTeams(): Team[] {
    if (this.actiefFilter === 'Alle') return this.alleTeams;
    return this.alleTeams.filter(t => t.categorie === this.actiefFilter);
  }

  zetFilter(cat: string) {
    this.actiefFilter = cat;
  }

  ngOnInit() {
    this.titleService.setTitle('Royal Antwerp Eagles | Onze Teams');

    this.teamService.haalAlleTeamsOp().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        // Sorteer op jouw nieuwe drag & drop volgorde
        this.alleTeams = data.sort((a: Team, b: Team) => (a.volgorde ?? 999) - (b.volgorde ?? 999) || a.naam.localeCompare(b.naam));
        this.isLaden = false;
        this.cdr.detectChanges();
      },
      error: (fout) => {
        console.error('Kon de teams niet laden:', fout);
        this.isLaden = false;
        this.cdr.detectChanges();
      },
    });
  }
}
