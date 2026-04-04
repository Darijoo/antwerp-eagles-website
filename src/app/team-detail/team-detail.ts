import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TeamService, Team } from '../diensten/team';
import { WbscService, WbscSpeler } from '../diensten/wbsc.service';

@Component({
  selector: 'app-team-detail', // Dit kan bij jou anders heten
  standalone: true,
  imports: [RouterLink],
  templateUrl: './team-detail.html',
  styleUrl: './team-detail.scss',
})
export class TeamDetail implements OnInit {
  route = inject(ActivatedRoute);
  private teamService = inject(TeamService);
  private wbscService = inject(WbscService);
  private cdr = inject(ChangeDetectorRef); // De schilder!

  // Hier parkeren we de data uit Strapi
  team: Team | undefined;

  roster: WbscSpeler[] = [];
  rosterLaden = false;
  rosterFout = false;

  ngOnInit() {
    // 1. Lees de code uit de adresbalk (bijv: /teams/vzrl687j...)
    const teamIdFromUrl = this.route.snapshot.paramMap.get('id');

    if (teamIdFromUrl) {
      // 2. Vraag het op bij de TeamService
      this.teamService.haalTeamOp(teamIdFromUrl).subscribe({
        next: (data) => {
          this.team = data; // Stop de data in de variabele voor de HTML
          this.cdr.detectChanges(); // Teken het scherm!

          // Haal direct de spelerslijst op als er een WBSC link is!
          if (this.team.wbscTeamUrl) {
            this.rosterLaden = true;
            this.wbscService.haalTeamRosterOp(this.team.wbscTeamUrl).subscribe({
              next: (spelers) => {
                this.roster = spelers;
                this.rosterLaden = false;
                this.cdr.detectChanges();
              },
              error: (err) => {
                console.error('Fout bij laden spelerslijst:', err);
                this.rosterFout = true;
                this.rosterLaden = false;
                this.cdr.detectChanges();
              },
            });
          }
        },
        error: (fout) => {
          console.error('Oeps, kon het team niet vinden:', fout);
        },
      });
    }
  }
}
