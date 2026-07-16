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
        // Update de timestamp direct zodat andere gebruikers niet tegelijk een sync starten
        await setDoc(syncDocRef, { laatsteSync: nu });
        
        await this.voerSyncUit();
      }
    } catch (err: any) {
      // Negeren van permissie fouten: enkel ingelogde admins hebben rechten om de globale sync timestamp aan te passen
      if (err?.code === 'permission-denied') {
        // We loggen dit niet als error, want dit is verwacht gedrag voor normale bezoekers
        return;
      }
      console.error('Fout bij automatische kalender sync:', err);
    }
  }

  // Verwijder artefacten zoals 'flag' die WBSC soms in teamnamen scrapet (van img alt-attributen)
  private cleanTeamNaam(naam: string): string {
    return naam.replace(/flag/gi, '').trim();
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
              // Opgeschoonde namen van de WBSC scraper (verwijder 'flag'-artefacten)
              const schoneThuisploeg = this.cleanTeamNaam(match.thuisploeg);
              const schoneUitploeg = this.cleanTeamNaam(match.uitploeg);

              const bestaandeMatch = bestaandeMatchen.find((m: any) => {
                if (m.type !== 'wedstrijd' || m.team !== team.naam) return false;
                const mDatum = m.datum.toDate();
                return (
                  mDatum.getDate() === match.datum.getDate() &&
                  mDatum.getMonth() === match.datum.getMonth() &&
                  mDatum.getFullYear() === match.datum.getFullYear() &&
                  m.thuisploeg === schoneThuisploeg &&
                  m.uitploeg === schoneUitploeg &&
                  m.tijd === match.tijd
                );
              });

              if (bestaandeMatch) {
                const behoudUitslag = (bestaandeMatch as any).isHandmatigBewerkt;
                const nieuweUitslag = behoudUitslag ? bestaandeMatch.uitslag : match.uitslag;
                const nieuweGeannuleerd = match.geannuleerd ?? (bestaandeMatch as any).geannuleerd ?? false;

                if (
                  bestaandeMatch.uitslag !== nieuweUitslag ||
                  bestaandeMatch.tijd !== match.tijd ||
                  bestaandeMatch.locatie !== match.locatie ||
                  (bestaandeMatch as any).geannuleerd !== nieuweGeannuleerd
                ) {
                  await this.kalenderService.updateWedstrijd(bestaandeMatch.id!, {
                    uitslag: nieuweUitslag,
                    tijd: match.tijd,
                    locatie: match.locatie,
                    geannuleerd: nieuweGeannuleerd,
                  });
                }
              } else {
                // Nieuwe wedstrijd: sla op met schone teamnamen
                await this.kalenderService.voegWedstrijdToe({
                  type: 'wedstrijd',
                  team: team.naam,
                  thuisploeg: schoneThuisploeg,
                  uitploeg: schoneUitploeg,
                  datum: match.datum,
                  tijd: match.tijd,
                  locatie: match.locatie,
                  uitslag: match.uitslag,
                  geannuleerd: match.geannuleerd ?? false,
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
