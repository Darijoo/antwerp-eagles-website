import { Component, inject, ChangeDetectorRef, OnInit, DestroyRef } from '@angular/core';
import { TeamService, Team } from '../diensten/team';
import { Observable, firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { map } from 'rxjs/operators';
import { WbscService } from '../diensten/wbsc.service';
import { KalenderService } from '../diensten/kalender.service';
import { ImageOptimizerService } from '../diensten/image-optimizer.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-admin-teams',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-teams.html',
  styleUrl: './admin-teams.scss',
})
export class AdminTeams implements OnInit {
  private teamService = inject(TeamService);
  private storage = inject(Storage);
  private cdr = inject(ChangeDetectorRef);
  private wbscService = inject(WbscService);
  private kalenderService = inject(KalenderService);
  private imageOptimizer = inject(ImageOptimizerService);
  private destroyRef = inject(DestroyRef);

  teamsLijst: Team[] = [];
  draggedIndex: number | null = null;
  dragOverIndex: number | null = null;

  // Status van het formulier
  isAanHetOpslaan = false;
  geselecteerdBestand: File | null = null;
  toonFormulier = false;
  syncingTeamId: string | null = null;
  isSyncingAll = false;
  isSyncingAllRosters = false;
  syncingRosterTeamId: string | null = null;
  bewerkId: string | null = null;
  notificatie: { bericht: string; type: 'succes' | 'fout' } | null = null;
  private notificatieTimer: any;

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
    facebookUrl: '',
    instagramUrl: '',
    wbscTeamUrl: '',
    kleur: '#152269',
  };

  ngOnInit() {
    this.teamService.haalAlleTeamsOp().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((teams) => {
      // Sorteer op jouw eigen volgorde, en als terugval-optie alfabetisch!
      this.teamsLijst = teams.sort(
        (a: Team, b: Team) =>
          (a.volgorde ?? 999) - (b.volgorde ?? 999) || a.naam.localeCompare(b.naam),
      );
      this.cdr.detectChanges();
    });
  }

  toonNotificatie(bericht: string, type: 'succes' | 'fout' = 'succes') {
    if (this.notificatieTimer) clearTimeout(this.notificatieTimer);
    this.notificatie = { bericht, type };
    this.cdr.detectChanges();
    this.notificatieTimer = setTimeout(() => {
      this.notificatie = null;
      this.cdr.detectChanges();
    }, 4000);
  }

  verwijderTeam(id: string) {
    if (confirm('Weet je zeker dat je dit team definitief wilt verwijderen?')) {
      this.teamService.verwijderTeam(id).subscribe(() => {
        this.toonNotificatie('Team succesvol verwijderd!');
      });
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
    this.geselecteerdBestand = null; // Zorg dat een oude foto niet blijft hangen
    this.nieuwTeam = {
      naam: team.naam,
      categorie: team.categorie || '',
      omschrijving: team.omschrijving || '',
      afbeeldingUrl: team.afbeeldingUrl || '',
      coach: team.coach || '',
      trainingsdagen: team.trainingsdagen || '',
      facebookUrl: team.facebookUrl || '',
      instagramUrl: team.instagramUrl || '',
      wbscTeamUrl: team.wbscTeamUrl || '',
      kleur: team.kleur || '#152269',
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

  // Verwijderd: comprimeerAfbeelding is verplaatst naar ImageOptimizerService

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
    this.cdr.detectChanges(); // Zorg dat de knop direct toont dat we bezig zijn!

    try {
      // Upload de afbeelding naar de /teams map in Firebase Storage
      if (this.geselecteerdBestand) {
        // Verklein de foto supersnel in de browser voordat we hem naar Firebase sturen
        const gecomprimeerdBestand = await this.imageOptimizer.comprimeerAfbeelding(this.geselecteerdBestand);

        const bestandsNaam = `teams/${Date.now()}_${this.geselecteerdBestand.name}`;
        const opslagRef = ref(this.storage, bestandsNaam);
        const uploadResultaat = await uploadBytes(opslagRef, gecomprimeerdBestand);
        this.nieuwTeam.afbeeldingUrl = await getDownloadURL(uploadResultaat.ref);
      }

      // Gebruik firstValueFrom om netjes te wachten tot de database klaar is
      if (this.bewerkId !== null) {
        await firstValueFrom(this.teamService.updateTeam(this.bewerkId, this.nieuwTeam));
      } else {
        (this.nieuwTeam as any).volgorde = this.teamsLijst.length; // Zet een nieuw team standaard achteraan de lijst
        await firstValueFrom(this.teamService.voegTeamToe(this.nieuwTeam));
      }

      this.isAanHetOpslaan = false;
      this.toonFormulier = false;
      this.resetFormulier();
      this.toonNotificatie('Team succesvol opgeslagen!', 'succes');
      this.cdr.detectChanges(); // Ververs het scherm
    } catch (error) {
      console.error('Fout bij het opslaan:', error);
      this.toonNotificatie('Er is een fout opgetreden bij het uploaden van de afbeelding.', 'fout');
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
      facebookUrl: '',
      instagramUrl: '',
      wbscTeamUrl: '',
      kleur: '#152269',
    };
    this.trainingen = [];
  }

  voegTrainingToe() {
    this.trainingen.push({ dag: 'Maandag', start: '18:00', eind: '20:00' });
  }

  verwijderTraining(index: number) {
    this.trainingen.splice(index, 1);
  }

  // --- DRAG & DROP LOGICA ---
  onDragStart(index: number) {
    this.draggedIndex = index;
  }
  onDragOver(event: DragEvent, index: number) {
    event.preventDefault(); // Noodzakelijk om het "droppen" toe te staan
    this.dragOverIndex = index;
  }
  onDrop(event: DragEvent, index: number) {
    event.preventDefault();
    if (this.draggedIndex !== null && this.draggedIndex !== index) {
      const draggedTeam = this.teamsLijst[this.draggedIndex];
      this.teamsLijst.splice(this.draggedIndex, 1);
      this.teamsLijst.splice(index, 0, draggedTeam);
      this.updateVolgorde();
    }
    this.draggedIndex = null;
    this.dragOverIndex = null;
  }
  onDragEnd() {
    this.draggedIndex = null;
    this.dragOverIndex = null;
  }
  async updateVolgorde() {
    try {
      const promises = this.teamsLijst.map((team, i) => {
        team.volgorde = i; // Bewaar tijdelijk lokaal
        return firstValueFrom(
          this.teamService.updateTeam(team.id!, { volgorde: i } as Partial<Team>),
        );
      });
      await Promise.all(promises);
    } catch (e) {
      this.toonNotificatie('Fout bij opslaan van de nieuwe volgorde.', 'fout');
    }
  }

  async syncKalender(team: Team) {
    const teamUrl = team.wbscTeamUrl;
    if (!teamUrl) {
      this.toonNotificatie('Geen WBSC URL ingesteld voor dit team.', 'fout');
      return;
    }

    // Vorm de Team-URL om naar een Kalender-URL indien nodig
    let fetchUrl = teamUrl;
    const match = teamUrl.match(/events\/([^\/]+)\/teams\/([^\/?#]+)/);
    if (match) {
      fetchUrl = `https://www.baseballsoftball.be/en/events/${match[1]}/calendars?team=${match[2]}`;
    }

    this.syncingTeamId = team.id;

    try {
      const bestaandeMatchen = await firstValueFrom(this.kalenderService.haalAlleWedstrijdenOp());
      const result = await firstValueFrom(this.wbscService.haalTeamMatchenOp(fetchUrl));

      if (result.matchen && result.matchen.length > 0) {
        let aantalToegevoegd = 0;
        let aantalGeupdate = 0;

        for (const match of result.matchen) {
          const bestaandeMatch = bestaandeMatchen.find((m: any) => {
            if (m.type !== 'wedstrijd' || m.team !== team.naam) return false;
            const mDatum = m.datum.toDate();
            return (
              mDatum.getDate() === match.datum.getDate() &&
              mDatum.getMonth() === match.datum.getMonth() &&
              mDatum.getFullYear() === match.datum.getFullYear() &&
              m.thuisploeg === match.thuisploeg &&
              m.uitploeg === match.uitploeg &&
              m.tijd === match.tijd // Tijdstip meenemen zodat doubleheaders (13:30 EN 15:30) apart worden opgeslagen!
            );
          });

          if (bestaandeMatch) {
            const behoudUitslag = (bestaandeMatch as any).isHandmatigBewerkt;
            const nieuweUitslag = behoudUitslag ? bestaandeMatch.uitslag : match.uitslag;

            if (
              bestaandeMatch.uitslag !== nieuweUitslag ||
              bestaandeMatch.tijd !== match.tijd ||
              bestaandeMatch.locatie !== match.locatie
            ) {
              await this.kalenderService.updateWedstrijd(bestaandeMatch.id!, {
                uitslag: nieuweUitslag,
                tijd: match.tijd,
                locatie: match.locatie,
              });
              bestaandeMatch.uitslag = nieuweUitslag;
              bestaandeMatch.tijd = match.tijd;
              bestaandeMatch.locatie = match.locatie;
              aantalGeupdate++;
            }
          } else {
            const docRef = await this.kalenderService.voegWedstrijdToe({
              type: 'wedstrijd',
              team: team.naam,
              thuisploeg: match.thuisploeg,
              uitploeg: match.uitploeg,
              datum: match.datum,
              tijd: match.tijd,
              locatie: match.locatie,
              uitslag: match.uitslag,
            });

            bestaandeMatchen.push({
              id: docRef.id, // OPLOSSING: We bewaren het ID direct, zodat hij niet 'undefined' is bij de volgende loop!
              type: 'wedstrijd',
              team: team.naam,
              thuisploeg: match.thuisploeg,
              uitploeg: match.uitploeg,
              datum: { toDate: () => match.datum },
              tijd: match.tijd,
              locatie: match.locatie,
              uitslag: match.uitslag,
            } as any);

            aantalToegevoegd++;
          }
        }
        this.toonNotificatie(
          `Klaar! ${aantalToegevoegd} nieuw toegevoegd en ${aantalGeupdate} geüpdatet voor ${team.naam}.`,
        );
      } else {
        this.toonNotificatie(`Geen wedstrijden gevonden voor ${team.naam}.`, 'fout');
      }
    } catch (err) {
      console.error('Fout bij WBSC API of Kalender:', err);
      this.toonNotificatie('Kon wedstrijden niet ophalen of opslaan.', 'fout');
    }

    this.syncingTeamId = null;
    this.cdr.detectChanges();
  }

  async syncAlleKalenders() {
    this.isSyncingAll = true;
    this.cdr.detectChanges();

    try {
      const teams = await firstValueFrom(this.teamService.haalAlleTeamsOp());
      const teamsMetUrl = teams.filter((t) => !!t.wbscTeamUrl);

      if (teamsMetUrl.length === 0) {
        this.toonNotificatie('Geen teams met een WBSC link gevonden om te syncen.', 'fout');
        this.isSyncingAll = false;
        this.cdr.detectChanges();
        return;
      }

      // Haal alle bestaande wedstrijden 1x op om onnodige database oproepen te vermijden
      const bestaandeMatchen = await firstValueFrom(this.kalenderService.haalAlleWedstrijdenOp());
      let totaalToegevoegd = 0;
      let totaalGeupdate = 0;

      // Voer alle requests PARALLEL uit in plaats van één voor één! (Tot 10x sneller)
      await Promise.all(
        teamsMetUrl.map(async (team) => {
          try {
            let fetchUrl = team.wbscTeamUrl!;

            // Vorm de Team-URL om naar een Kalender-URL
            const match = fetchUrl.match(/events\/([^\/]+)\/teams\/([^\/?#]+)/);
            if (match) {
              fetchUrl = `https://www.baseballsoftball.be/en/events/${match[1]}/calendars?team=${match[2]}`;
            }

            const result = await firstValueFrom(this.wbscService.haalTeamMatchenOp(fetchUrl));
            if (result.matchen && result.matchen.length > 0) {
              for (const match of result.matchen) {
                const bestaandeMatch = bestaandeMatchen.find((m: any) => {
                  if (m.type !== 'wedstrijd' || m.team !== team.naam) return false;
                  const mDatum = m.datum.toDate();
                  return (
                    mDatum.getDate() === match.datum.getDate() &&
                    mDatum.getMonth() === match.datum.getMonth() &&
                    mDatum.getFullYear() === match.datum.getFullYear() &&
                    m.thuisploeg === match.thuisploeg &&
                    m.uitploeg === match.uitploeg &&
                    m.tijd === match.tijd // Tijdstip meenemen zodat doubleheaders (13:30 EN 15:30) apart worden opgeslagen!
                  );
                });

                if (bestaandeMatch) {
                  const behoudUitslag = (bestaandeMatch as any).isHandmatigBewerkt;
                  const nieuweUitslag = behoudUitslag ? bestaandeMatch.uitslag : match.uitslag;

                  if (
                    bestaandeMatch.uitslag !== nieuweUitslag ||
                    bestaandeMatch.tijd !== match.tijd ||
                    bestaandeMatch.locatie !== match.locatie
                  ) {
                    await this.kalenderService.updateWedstrijd(bestaandeMatch.id!, {
                      uitslag: nieuweUitslag,
                      tijd: match.tijd,
                      locatie: match.locatie,
                    });
                    bestaandeMatch.uitslag = nieuweUitslag;
                    bestaandeMatch.tijd = match.tijd;
                    bestaandeMatch.locatie = match.locatie;
                    totaalGeupdate++;
                  }
                } else {
                  const docRef = await this.kalenderService.voegWedstrijdToe({
                    type: 'wedstrijd',
                    team: team.naam,
                    thuisploeg: match.thuisploeg,
                    uitploeg: match.uitploeg,
                    datum: match.datum,
                    tijd: match.tijd,
                    locatie: match.locatie,
                    uitslag: match.uitslag,
                  });

                  bestaandeMatchen.push({
                    id: docRef.id, // OPLOSSING: We bewaren het ID direct!
                    type: 'wedstrijd',
                    team: team.naam,
                    thuisploeg: match.thuisploeg,
                    uitploeg: match.uitploeg,
                    datum: { toDate: () => match.datum },
                    tijd: match.tijd,
                    locatie: match.locatie,
                    uitslag: match.uitslag,
                  } as any);

                  totaalToegevoegd++;
                }
              }
            }
          } catch (err) {
            console.error(`Fout bij ophalen matchen voor ${team.naam}:`, err);
          }
        }),
      );

      this.toonNotificatie(
        `Klaar! ${totaalToegevoegd} nieuwe toegevoegd en ${totaalGeupdate} geüpdatet over alle teams.`,
      );
    } catch (err) {
      console.error('Fout bij globale kalender sync:', err);
      this.toonNotificatie('Er is een fout opgetreden bij het synchroniseren.', 'fout');
    }

    this.isSyncingAll = false;
    this.cdr.detectChanges();
  }

  async syncAlleRosters() {
    this.isSyncingAllRosters = true;
    this.cdr.detectChanges();

    try {
      const teams = await firstValueFrom(this.teamService.haalAlleTeamsOp());
      const teamsMetUrl = teams.filter((t) => !!t.wbscTeamUrl);

      if (teamsMetUrl.length === 0) {
        this.toonNotificatie('Geen teams met een WBSC link gevonden om te syncen.', 'fout');
        this.isSyncingAllRosters = false;
        this.cdr.detectChanges();
        return;
      }

      let totaalGeupdate = 0;

      // OOK HIER PARALLEL UITVOEREN VOOR DE ROSTERS!
      await Promise.all(
        teamsMetUrl.map(async (team) => {
          try {
            const spelers = await firstValueFrom(
              this.wbscService.haalTeamRosterOp(team.wbscTeamUrl!),
            );
            if (spelers && spelers.length > 0) {
              await firstValueFrom(this.teamService.updateTeam(team.id, { roster: spelers }));
              totaalGeupdate++;
            }
          } catch (err) {
            console.error(`Fout bij ophalen roster voor ${team.naam}:`, err);
          }
        }),
      );

      this.toonNotificatie(`Klaar! ${totaalGeupdate} team rosters succesvol geüpdatet.`);
    } catch (err) {
      console.error('Fout bij globale roster sync:', err);
      this.toonNotificatie(
        'Er is een fout opgetreden bij het synchroniseren van de rosters.',
        'fout',
      );
    }

    this.isSyncingAllRosters = false;
    this.cdr.detectChanges();
  }

  syncRoster(team: Team) {
    const teamUrl = team.wbscTeamUrl;
    if (!teamUrl) return;
    this.syncingRosterTeamId = team.id;

    this.wbscService.haalTeamRosterOp(teamUrl).subscribe({
      next: (spelers) => {
        if (spelers && spelers.length > 0) {
          this.teamService.updateTeam(team.id, { roster: spelers }).subscribe({
            next: () => {
              this.toonNotificatie(`Spelerslijst gesynchroniseerd voor ${team.naam}!`);
              this.syncingRosterTeamId = null;
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Fout bij opslaan roster in database:', err);
              this.toonNotificatie('Kon de spelerslijst niet opslaan in de database.', 'fout');
              this.syncingRosterTeamId = null;
              this.cdr.detectChanges();
            },
          });
        } else {
          this.toonNotificatie(
            `Geen spelers gevonden op de website van de bond voor ${team.naam}.`,
            'fout',
          );
          this.syncingRosterTeamId = null;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Fout bij WBSC API (Roster):', err);
        this.toonNotificatie('Kon de spelerslijst niet ophalen van de bond.', 'fout');
        this.syncingRosterTeamId = null;
        this.cdr.detectChanges();
      },
    });
  }
}
