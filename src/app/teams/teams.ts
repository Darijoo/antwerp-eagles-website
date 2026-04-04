import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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

  // We maken een lijst (array) aan om alle teams in op te slaan
  alleTeams: Team[] = [];

  ngOnInit() {
    this.teamService.haalAlleTeamsOp().subscribe({
      next: (data) => {
        // Sorteer alfabetisch op teamnaam (A-Z)
        this.alleTeams = data.sort((a, b) => a.naam.localeCompare(b.naam));
        this.cdr.detectChanges();
      },
      error: (fout) => {
        console.error('Kon de teams niet laden:', fout);
      },
    });
  }
}
