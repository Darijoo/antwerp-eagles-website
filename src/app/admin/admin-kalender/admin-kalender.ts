import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { KalenderService, Match } from '../../diensten/kalender.service';

@Component({
  selector: 'app-admin-kalender',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-kalender.html',
  styleUrl: './admin-kalender.scss',
})
export class AdminKalender {
  private kalenderService = inject(KalenderService);
  private fb = inject(FormBuilder);

  bewerkId: string | null = null;
  wedstrijden$: Observable<Match[]>;
  wedstrijdForm = this.fb.group({
    type: ['wedstrijd', Validators.required],
    datum: ['', Validators.required],
    tijd: ['', Validators.required],
    team: [''],
    thuisploeg: ['Antwerp Eagles'],
    uitploeg: [''],
    titel: [''],
    omschrijving: [''],
    locatie: ['Eglantierlaan, Wilrijk', Validators.required],
    uitslag: [''],
  });

  constructor() {
    this.wedstrijden$ = this.kalenderService.haalAlleWedstrijdenOp().pipe(
      map((wedstrijden) => wedstrijden.slice().reverse()), // Draait de lijst om (nieuwste bovenaan)
    );
  }

  async onSubmit() {
    if (this.wedstrijdForm.invalid) {
      alert('Let op: Vul alle verplichte velden in (Datum, Tijd en Locatie).');
      return;
    }

    const formValue = this.wedstrijdForm.value;
    const nieuweWedstrijd = {
      type: (formValue.type as 'wedstrijd' | 'evenement') || 'wedstrijd',
      datum: new Date(formValue.datum || ''),
      tijd: formValue.tijd || '',
      team: formValue.team || '',
      thuisploeg: formValue.thuisploeg || '',
      uitploeg: formValue.uitploeg || '',
      titel: formValue.titel || '',
      omschrijving: formValue.omschrijving || '',
      locatie: formValue.locatie || '',
      uitslag: formValue.uitslag || '',
    };

    try {
      if (this.bewerkId) {
        await this.kalenderService.updateWedstrijd(this.bewerkId, nieuweWedstrijd);
        alert('Wedstrijd succesvol bijgewerkt!');
      } else {
        await this.kalenderService.voegWedstrijdToe(nieuweWedstrijd);
        alert('Wedstrijd succesvol toegevoegd!');
      }
      this.annuleerBewerken();
    } catch (error) {
      console.error('Fout bij opslaan:', error);
      alert('Er ging iets mis bij het opslaan naar de database!');
    }
  }

  bewerkWedstrijd(wedstrijd: Match) {
    this.bewerkId = wedstrijd.id || null;

    // Zet de Firestore datum netjes om naar YYYY-MM-DD voor het kalender-inputveld
    const d = wedstrijd.datum.toDate();
    const datumString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    this.wedstrijdForm.patchValue({
      type: wedstrijd.type || 'wedstrijd',
      datum: datumString,
      tijd: wedstrijd.tijd,
      team: wedstrijd.team || '',
      thuisploeg: wedstrijd.thuisploeg || '',
      uitploeg: wedstrijd.uitploeg || '',
      titel: wedstrijd.titel || '',
      omschrijving: wedstrijd.omschrijving || '',
      locatie: wedstrijd.locatie,
      uitslag: wedstrijd.uitslag || '',
    });

    // Scroll even soepel omhoog naar het formulier
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  annuleerBewerken() {
    this.bewerkId = null;
    this.wedstrijdForm.reset({
      type: 'wedstrijd',
      team: '',
      thuisploeg: 'Antwerp Eagles',
      uitploeg: '',
      titel: '',
      omschrijving: '',
      locatie: 'Eglantierlaan, Wilrijk',
    });
  }

  async verwijderWedstrijd(id: string) {
    if (confirm('Weet je zeker dat je deze wedstrijd wilt verwijderen?')) {
      await this.kalenderService.verwijderWedstrijd(id);
      alert('Wedstrijd verwijderd!');
    }
  }

  // Controleert of een wedstrijd in het verleden ligt
  isGespeeld(datum: any): boolean {
    const wedstrijdDatum = datum.toDate();
    const vandaag = new Date();
    vandaag.setHours(0, 0, 0, 0);
    return wedstrijdDatum < vandaag;
  }
}
