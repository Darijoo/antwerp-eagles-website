import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { TeamService, Team } from '../diensten/team';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Component({
  selector: 'app-admin-teams',
  standalone: true,
  imports: [AsyncPipe, FormsModule],
  templateUrl: './admin-teams.html',
  styleUrls: ['./admin-teams.css'],
})
export class AdminTeams {
  private teamService = inject(TeamService);
  private storage = inject(Storage);
  private cdr = inject(ChangeDetectorRef);

  teams$: Observable<Team[]> = this.teamService.haalAlleTeamsOp();

  // Status van het formulier
  isAanHetOpslaan = false;
  geselecteerdBestand: File | null = null;
  toonFormulier = false;
  bewerkId: string | null = null;

  // Voor het dynamisch kiezen van trainingsmomenten
  trainingen: { dag: string; start: string; eind: string }[] = [];
  beschikbareDagen = [
    'Maandag',
    'Dinsdag',
    'Woensdag',
    'Donderdag',
    'Vrijdag',
    'Zaterdag',
    'Zondag',
  ];

  nieuwTeam: Omit<Team, 'id'> = {
    naam: '',
    categorie: '',
    omschrijving: '',
    afbeeldingUrl: '',
    coach: '',
    trainingsdagen: '',
  };

  verwijderTeam(id: string) {
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
      categorie: team.categorie || '',
      omschrijving: team.omschrijving || '',
      afbeeldingUrl: team.afbeeldingUrl || '',
      coach: team.coach || '',
      trainingsdagen: team.trainingsdagen || '',
    };

    // Probeer bestaande tekst (bv "Maandag 19:30 - 21:00") netjes in te laden in de keuzelijstjes
    this.trainingen = [];
    if (team.trainingsdagen) {
      const momenten = team.trainingsdagen.split(' & ');
      for (const m of momenten) {
        const match = m.match(/^([A-Za-z]+)\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
        if (match) {
          this.trainingen.push({ dag: match[1], start: match[2], eind: match[3] });
        }
      }
    }

    this.toonFormulier = true;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.geselecteerdBestand = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.nieuwTeam.afbeeldingUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async opslaan() {
    // Zet de gekozen lijst met trainingen om naar 1 overzichtelijke tekst voor in de database
    if (this.trainingen.length > 0) {
      this.nieuwTeam.trainingsdagen = this.trainingen
        .filter((t) => t.dag && t.start && t.eind)
        .map((t) => `${t.dag} ${t.start} - ${t.eind}`)
        .join(' & ');
    } else {
      this.nieuwTeam.trainingsdagen = '';
    }

    this.isAanHetOpslaan = true;
    try {
      // Upload de afbeelding naar de /teams map in Firebase Storage
      if (this.geselecteerdBestand) {
        const bestandsNaam = `teams/${Date.now()}_${this.geselecteerdBestand.name}`;
        const opslagRef = ref(this.storage, bestandsNaam);
        const uploadResultaat = await uploadBytes(opslagRef, this.geselecteerdBestand);
        this.nieuwTeam.afbeeldingUrl = await getDownloadURL(uploadResultaat.ref);
      }

      const onSuccess = () => {
        this.isAanHetOpslaan = false;
        this.toonFormulier = false;
        this.resetFormulier();
        this.cdr.detectChanges(); // Ververs het scherm
      };

      const dbObserver = {
        next: onSuccess,
        complete: onSuccess,
        error: (err: any) => {
          console.error('Fout bij opslaan in database:', err);
          this.isAanHetOpslaan = false;
          this.cdr.detectChanges();
          alert('Opslaan mislukt! Kijk in de F12 Console voor meer details.');
        },
      };

      if (this.bewerkId !== null) {
        this.teamService.updateTeam(this.bewerkId, this.nieuwTeam).subscribe(dbObserver);
      } else {
        this.teamService.voegTeamToe(this.nieuwTeam).subscribe(dbObserver);
      }
    } catch (error) {
      console.error('Fout bij het opslaan:', error);
      alert('Er is een fout opgetreden bij het uploaden van de afbeelding.');
      this.isAanHetOpslaan = false;
      this.cdr.detectChanges();
    }
  }

  private resetFormulier() {
    this.bewerkId = null;
    this.geselecteerdBestand = null;
    this.nieuwTeam = {
      naam: '',
      categorie: '',
      omschrijving: '',
      afbeeldingUrl: '',
      coach: '',
      trainingsdagen: '',
    };
    this.trainingen = [];
  }

  voegTrainingToe() {
    this.trainingen.push({ dag: 'Maandag', start: '19:30', eind: '21:00' });
  }

  verwijderTraining(index: number) {
    this.trainingen.splice(index, 1);
  }
}
