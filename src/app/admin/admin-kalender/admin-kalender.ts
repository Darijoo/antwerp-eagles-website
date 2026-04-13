import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable, BehaviorSubject, combineLatest, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { Firestore, collection, collectionData, Timestamp } from '@angular/fire/firestore';
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
  private firestore = inject(Firestore);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  notificatie: { bericht: string; type: 'succes' | 'fout' } | null = null;
  private notificatieTimer: any;

  bewerkId: string | null = null;
  teams$: Observable<any[]>;

  filterType$ = new BehaviorSubject<string>('');
  filterTeam$ = new BehaviorSubject<string>('');
  toonVerledenEvents$ = new BehaviorSubject<boolean>(false);

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
    isHandmatigBewerkt: [false],
    geannuleerd: [false],
  });

  toonNotificatie(bericht: string, type: 'succes' | 'fout' = 'succes') {
    if (this.notificatieTimer) clearTimeout(this.notificatieTimer);
    this.notificatie = { bericht, type };
    this.cdr.detectChanges();
    this.notificatieTimer = setTimeout(() => {
      this.notificatie = null;
      this.cdr.detectChanges();
    }, 4000);
  }

  constructor() {
    const alleWedstrijden$ = this.kalenderService
      .haalAlleWedstrijdenOp()
      .pipe(
        map((wedstrijden) =>
          wedstrijden
            .slice()
            .sort((a, b) => this.getDatum(a.datum).getTime() - this.getDatum(b.datum).getTime()),
        ),
      );

    this.wedstrijden$ = combineLatest([
      alleWedstrijden$,
      this.filterType$,
      this.filterTeam$,
      this.toonVerledenEvents$,
    ]).pipe(
      map(([wedstrijden, type, team, toonVerleden]) => {
        return wedstrijden.filter((w) => {
          const matchType = type === '' || (w.type || 'wedstrijd') === type;
          const matchTeam = team === '' || w.team === team;
          const matchVerleden = toonVerleden ? true : !this.isGespeeld(w.datum);
          return matchType && matchTeam && matchVerleden;
        });
      }),
    );

    const teamsRef = collection(this.firestore, 'teams');
    this.teams$ = collectionData(teamsRef, { idField: 'id' }).pipe(
      map((teams) => teams.sort((a: any, b: any) => a.naam.localeCompare(b.naam))),
    );
  }

  async onSubmit() {
    if (this.wedstrijdForm.invalid) {
      this.toonNotificatie(
        'Let op: Vul alle verplichte velden in (Datum, Tijd en Locatie).',
        'fout',
      );
      return;
    }

    const formValue = this.wedstrijdForm.value;
    const nieuweWedstrijd = {
      type: (formValue.type as 'wedstrijd' | 'evenement') || 'wedstrijd',
      datum: Timestamp.fromDate(new Date(formValue.datum || '')),
      tijd: formValue.tijd || '',
      team: formValue.team || '',
      thuisploeg: formValue.thuisploeg || '',
      uitploeg: formValue.uitploeg || '',
      titel: formValue.titel || '',
      omschrijving: formValue.omschrijving || '',
      locatie: formValue.locatie || '',
      uitslag: formValue.uitslag || '',
      isHandmatigBewerkt: formValue.isHandmatigBewerkt || false,
      geannuleerd: formValue.geannuleerd || false,
    };

    try {
      if (this.bewerkId) {
        await this.kalenderService.updateWedstrijd(this.bewerkId, nieuweWedstrijd);
        this.toonNotificatie('Wedstrijd succesvol bijgewerkt!');
      } else {
        await this.kalenderService.voegWedstrijdToe(nieuweWedstrijd);
        this.toonNotificatie('Wedstrijd succesvol toegevoegd!');
      }
      this.annuleerBewerken();
    } catch (error) {
      console.error('Fout bij opslaan:', error);
      this.toonNotificatie('Er ging iets mis bij het opslaan naar de database!', 'fout');
    }
  }

  bewerkWedstrijd(wedstrijd: Match) {
    this.bewerkId = wedstrijd.id || null;

    // Zet de Firestore datum netjes om naar YYYY-MM-DD voor het kalender-inputveld
    const d = this.getDatum(wedstrijd.datum);
    const datumString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    this.wedstrijdForm.patchValue({
      type: wedstrijd.type || 'wedstrijd',
      datum: datumString,
      tijd: wedstrijd.tijd,
      team: wedstrijd.team || '',
      thuisploeg: this.cleanTeamNaam(wedstrijd.thuisploeg),
      uitploeg: this.cleanTeamNaam(wedstrijd.uitploeg),
      titel: wedstrijd.titel || '',
      omschrijving: wedstrijd.omschrijving || '',
      locatie: wedstrijd.locatie,
      uitslag: wedstrijd.uitslag || '',
      isHandmatigBewerkt: (wedstrijd as any).isHandmatigBewerkt || false,
      geannuleerd: (wedstrijd as any).geannuleerd || false,
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
      isHandmatigBewerkt: false,
      geannuleerd: false,
    });
  }

  async verwijderWedstrijd(id: string) {
    await this.kalenderService.verwijderWedstrijd(id);
    this.toonNotificatie('Wedstrijd succesvol verwijderd!');
  }

  async verwijderAlles() {
    if (
      confirm(
        '⚠️ WAARSCHUWING! Weet je zeker dat je ALLE wedstrijden en evenementen definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt!',
      )
    ) {
      try {
        const alleItems = await firstValueFrom(this.kalenderService.haalAlleWedstrijdenOp());
        if (alleItems.length === 0) {
          this.toonNotificatie('Er zijn geen items om te verwijderen.', 'fout');
          return;
        }

        this.toonNotificatie('Bezig met verwijderen van alle items...', 'succes');
        for (const item of alleItems) {
          if (item.id) {
            await this.kalenderService.verwijderWedstrijd(item.id);
          }
        }
        this.toonNotificatie('Alle kalender items zijn succesvol verwijderd!');
      } catch (error) {
        console.error('Fout bij het verwijderen van alles:', error);
        this.toonNotificatie('Er is een fout opgetreden bij het verwijderen.', 'fout');
      }
    }
  }

  onFilterTypeWijziging(event: Event) {
    const type = (event.target as HTMLSelectElement).value;
    this.filterType$.next(type);
    if (type === 'evenement') {
      this.filterTeam$.next(''); // Reset teamfilter bij evenementen
    }
  }

  onFilterTeamWijziging(event: Event) {
    const team = (event.target as HTMLSelectElement).value;
    this.filterTeam$.next(team);
  }

  toggleVerledenEvents() {
    this.toonVerledenEvents$.next(!this.toonVerledenEvents$.value);
  }

  // Controleert of een wedstrijd in het verleden ligt
  isGespeeld(datum: any): boolean {
    const wedstrijdDatum = this.getDatum(datum);
    const vandaag = new Date();
    vandaag.setHours(0, 0, 0, 0);
    return wedstrijdDatum < vandaag;
  }

  // Verwijder het woord 'flag' uit gescrapete teamnamen
  cleanTeamNaam(naam: string | undefined): string {
    if (!naam) return '';
    return naam.replace(/flag/gi, '').trim();
  }

  // Helper om altijd veilig een datum op te halen, ongeacht of het lokaal een Timestamp of JS Date is
  getDatum(datum: any): Date {
    return datum && typeof datum.toDate === 'function' ? datum.toDate() : new Date(datum);
  }
}
