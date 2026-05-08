import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable, BehaviorSubject, combineLatest, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { Firestore, collection, collectionData, Timestamp } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { KalenderService, Match } from '../../diensten/kalender.service';
import { ImageOptimizerService } from '../../diensten/image-optimizer.service';

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
  private storage = inject(Storage);
  private imageOptimizer = inject(ImageOptimizerService);

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
    inschrijfLink: [''],
    posterUrl: [''],
  });

  geselecteerdePoster: File | null = null;
  isAanHetOpslaan = false;

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
      inschrijfLink: formValue.inschrijfLink || '',
      posterUrl: formValue.posterUrl || '',
    };

    try {
      this.isAanHetOpslaan = true;
      this.cdr.detectChanges();

      if (this.geselecteerdePoster) {
        const gecomprimeerdBestand = await this.imageOptimizer.comprimeerAfbeelding(this.geselecteerdePoster);
        const bestandsNaam = `evenementen/${Date.now()}_${this.geselecteerdePoster.name}`;
        const opslagRef = ref(this.storage, bestandsNaam);
        const uploadResultaat = await uploadBytes(opslagRef, gecomprimeerdBestand);
        nieuweWedstrijd.posterUrl = await getDownloadURL(uploadResultaat.ref);
      }
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
    } finally {
      this.isAanHetOpslaan = false;
      this.cdr.detectChanges();
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.geselecteerdePoster = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.wedstrijdForm.patchValue({ posterUrl: e.target.result });
      };
      reader.readAsDataURL(file);
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
      inschrijfLink: wedstrijd.inschrijfLink || '',
      posterUrl: wedstrijd.posterUrl || '',
    });
    this.geselecteerdePoster = null;

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
      inschrijfLink: '',
      posterUrl: '',
    });
    this.geselecteerdePoster = null;
  }

  async verwijderWedstrijd(id: string) {
    await this.kalenderService.verwijderWedstrijd(id);
    this.toonNotificatie('Wedstrijd succesvol verwijderd!');
  }

  async verwijderGefilterd() {
    const gefilterdItems = await firstValueFrom(this.wedstrijden$);

    if (gefilterdItems.length === 0) {
      this.toonNotificatie('Er zijn geen zichtbare items om te verwijderen.', 'fout');
      return;
    }

    // Bouw een leesbaar overzicht van de actieve filters
    const activeFilters: string[] = [];
    if (this.filterType$.value) activeFilters.push(`type: ${this.filterType$.value}`);
    if (this.filterTeam$.value) activeFilters.push(`team: ${this.filterTeam$.value}`);
    if (!this.toonVerledenEvents$.value) activeFilters.push('alleen toekomstige');
    const filterTekst = activeFilters.length > 0 ? ` (filter: ${activeFilters.join(', ')})` : ' (geen filter — DIT VERWIJDERT ALLES!)';

    if (
      confirm(
        `⚠️ Je staat op het punt ${gefilterdItems.length} item(s)${filterTekst} definitief te verwijderen. Dit kan NIET ongedaan worden gemaakt!`,
      )
    ) {
      try {
        this.toonNotificatie(`Bezig met verwijderen van ${gefilterdItems.length} items...`, 'succes');
        for (const item of gefilterdItems) {
          if (item.id) {
            await this.kalenderService.verwijderWedstrijd(item.id);
          }
        }
        this.toonNotificatie(`${gefilterdItems.length} items succesvol verwijderd!`);
      } catch (error) {
        console.error('Fout bij het verwijderen:', error);
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
