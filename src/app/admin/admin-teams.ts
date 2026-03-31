import { Component, OnInit, inject } from '@angular/core';
import { TeamService, Team } from '../diensten/team';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-teams',
  standalone: true,
  imports: [AsyncPipe, FormsModule],
  templateUrl: './admin-teams.html',
  styleUrls: ['./admin-teams.css'],
})
export class AdminTeams implements OnInit {
  private teamService = inject(TeamService);

  teams$!: Observable<Team[]>;

  // Status van het formulier
  toonFormulier = false;
  bewerkId: number | null = null;
  nieuwTeam: Omit<Team, 'id'> = {
    naam: '',
    categorie: '',
    omschrijving: '',
    afbeeldingUrl: '',
  };

  ngOnInit() {
    this.teams$ = this.teamService.haalAlleTeamsOp();
  }

  verwijderTeam(id: number) {
    if (confirm('Weet je zeker dat je dit team wilt verwijderen?')) {
      this.teamService.verwijderTeam(id).subscribe();
    }
  }

  toggleFormulier() {
    this.toonFormulier = !this.toonFormulier;
    if (!this.toonFormulier) {
      this.resetFormulier();
    }
  }

  bewerkTeam(team: Team) {
    this.bewerkId = team.id;
    this.nieuwTeam = {
      naam: team.naam,
      categorie: team.categorie,
      omschrijving: team.omschrijving,
      afbeeldingUrl: team.afbeeldingUrl || '',
    };
    this.toonFormulier = true;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.nieuwTeam.afbeeldingUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  opslaan() {
    if (this.bewerkId !== null) {
      this.teamService
        .updateTeam(this.bewerkId, this.nieuwTeam)
        .subscribe(() => this.toggleFormulier());
    } else {
      this.teamService.voegTeamToe(this.nieuwTeam).subscribe(() => this.toggleFormulier());
    }
  }

  private resetFormulier() {
    this.bewerkId = null;
    this.nieuwTeam = { naam: '', categorie: '', omschrijving: '', afbeeldingUrl: '' };
  }
}
