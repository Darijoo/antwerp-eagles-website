import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TeamService, Team } from '../diensten/team';

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
  private cdr = inject(ChangeDetectorRef);

  team: Team | undefined;

  ngOnInit() {
    const teamIdFromUrl = this.route.snapshot.paramMap.get('id');

    if (teamIdFromUrl) {
      this.teamService.haalTeamOp(teamIdFromUrl).subscribe({
        next: (data) => {
          this.team = data;
          this.cdr.detectChanges();
        },
        error: (fout) => {
          console.error('Oeps, kon het team niet vinden:', fout);
        },
      });
    }
  }
}
