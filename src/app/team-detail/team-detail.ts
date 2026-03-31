import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TeamService, Team } from '../diensten/team'; // Haal de nieuwe postbode binnen!

@Component({
  selector: 'app-team-detail', // Dit kan bij jou anders heten
  standalone: true,
  imports: [],
  templateUrl: './team-detail.html', // Jouw HTML bestand met de info-cards
  styleUrl: './team-detail.scss', // Jouw CSS bestand
})
export class TeamDetail implements OnInit {
  route = inject(ActivatedRoute);
  private teamService = inject(TeamService);
  private cdr = inject(ChangeDetectorRef); // De schilder!

  // Hier parkeren we de data uit Strapi
  team: Team | undefined;

  ngOnInit() {
    // 1. Lees de code uit de adresbalk (bijv: /teams/vzrl687j...)
    const teamIdFromUrl = this.route.snapshot.paramMap.get('id');

    if (teamIdFromUrl) {
      // 2. Vraag het op bij Strapi
      this.teamService.haalTeamOp(+teamIdFromUrl).subscribe({
        next: (data) => {
          this.team = data; // Stop de data in de variabele voor de HTML
          this.cdr.detectChanges(); // Teken het scherm!
        },
        error: (fout) => {
          console.error('Oeps, kon het team niet vinden:', fout);
        },
      });
    }
  }
}
