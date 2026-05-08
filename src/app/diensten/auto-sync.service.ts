import { Injectable, inject } from '@angular/core';
import { KalenderService } from './kalender.service';
import { TeamService } from './team';
import { WbscService } from './wbsc.service';
import { firstValueFrom } from 'rxjs';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AutoSyncService {
  private kalenderService = inject(KalenderService);
  private teamService = inject(TeamService);
  private wbscService = inject(WbscService);
  private firestore = inject(Firestore);

  // Sync maximaal 1x per 12 uur automatisch om Firebase reads en de WBSC servers te besparen
  private SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000; 

  async probeerAutomatischeSync() {
    try {
      const syncDocRef = doc(this.firestore, 'systeem/autosync');
      const syncDoc = await getDoc(syncDocRef);
      
      const nu = Date.now();
      let laatsteSync = 0;

      if (syncDoc.exists()) {
        laatsteSync = syncDoc.data()['laatsteSync'] || 0;
      }

      if (nu - laatsteSync > this.SYNC_INTERVAL_MS) {
        console.log('Automatische kalender sync gestart op de achtergrond...');
        // Update de timestamp direct zodat andere gebruikers niet tegelijk een sync starten
        await setDoc(syncDocRef, { laatsteSync: nu });
        
        await this.voerSyncUit();
        console.log('Automatische kalender sync succesvol afgerond!');
      } else {
        console.log('Kalender is recent nog gesynct. Volgende automatische sync over:', Math.round((this.SYNC_INTERVAL_MS - (nu - laatsteSync)) / 1000 / 60), 'minuten.');
      }
    } catch (err) {
      console.error('Fout bij automatische kalender sync:', err);
    }
  }

  private async voerSyncUit() {
    const teams = await firstValueFrom(this.teamService.haalAlleTeamsOp());
    const teamsMetUrl = teams.filter((t) => !!t.wbscTeamUrl);

    if (teamsMetUrl.length === 0) return;

    const bestaandeMatchen = await firstValueFrom(this.kalenderService.haalAlleWedstrijdenOp());

    await Promise.all(
      teamsMetUrl.map(async (team) => {
        try {
          let fetchUrl = team.wbscTeamUrl!;
          const matchUrl = fetchUrl.match(/events\/([^\/]+)\/teams\/([^\/?#]+)/);
          if (matchUrl) {
            fetchUrl = `https://www.baseballsoftball.be/en/events/${matchUrl[1]}/calendars?team=${matchUrl[2]}`;
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
                  m.tijd === match.tijd
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
                }
              } else {
                await this.kalenderService.voegWedstrijdToe({
                  type: 'wedstrijd',
                  team: team.naam,
                  thuisploeg: match.thuisploeg,
                  uitploeg: match.uitploeg,
                  datum: match.datum,
                  tijd: match.tijd,
                  locatie: match.locatie,
                  uitslag: match.uitslag,
                });
              }
            }
          }
        } catch (err) {
          console.error(`Achtergrond sync fout voor team ${team.naam}:`, err);
        }
      })
    );
  }
}
