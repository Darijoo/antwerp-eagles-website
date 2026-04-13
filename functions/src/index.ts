import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as cheerio from "cheerio";
import cors = require("cors");

admin.initializeApp();
const corsHandler = cors({origin: true});

// Dit is jouw eigen razendsnelle proxy-server in TypeScript!
export const wbscProxy = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    // In TypeScript moeten we expliciet aangeven dat de URL een string is
    const targetUrl = req.query.url as string;

    if (!targetUrl) {
      res.status(400).send("Geen URL opgegeven");
      return;
    }

    try {
      // Haal de HTML direct op bij de bond, maar doe alsof we een échte webbrowser zijn!
      // Dit voorkomt dat de website van de bond ons blokkeert als 'robot'.
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "nl-BE,nl;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });

      // Als de bond toch een foutcode geeft, laat het ons dan weten
      if (!response.ok) {
        res.status(response.status).send(`WBSC server gaf foutcode: ${response.status}`);
        return;
      }

      const html = await response.text();
      res.status(200).send(html);
    } catch (error) {
      console.error("Fout bij ophalen WBSC data:", error);
      res.status(500).send("Kon de data niet ophalen");
    }
  });
});

// --- DE AUTOMATISCHE WBSC SYNC (ELKE ZONDAG OM 19:00) ---
export const wekelijkseWbscSync = onSchedule("0 19 * * 0", async (event) => {
  const db = admin.firestore();
  console.log("Start wekelijkse automatische WBSC Sync...");

  try {
    const teamsSnapshot = await db.collection('teams').get();
    const bestaandeMatchenSnapshot = await db.collection('kalender').get();

    // Zet bestaande databank matchen om in een makkelijk doorzoekbare array
    const bestaandeMatchen = bestaandeMatchenSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    for (const teamDoc of teamsSnapshot.docs) {
      const team = teamDoc.data();

      if (team.wbscTeamUrl) {
        console.log(`Sync bezig voor: ${team.naam} - ${team.wbscTeamUrl}`);

        // --- 1. ROSTER SYNC ---
        try {
          const response = await fetch(team.wbscTeamUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)" }
          });
          const html = await response.text();
          const $ = cheerio.load(html);

          const spelers: any[] = [];
          $('table tbody tr').each((_, rij) => {
            const kolommen: string[] = [];
            $(rij).find('td').each((_, td) => {
              kolommen.push($(td).text().trim().replace(/\s+/g, ' '));
            });
            
            if (kolommen.length >= 3 && kolommen[1]) {
              spelers.push({
                rugnummer: kolommen[0],
                naam: kolommen[1],
                positie: kolommen[2],
                slagWorp: kolommen[3] || '',
                geboortejaar: kolommen[4] || '',
              });
            }
          });

          if (spelers.length > 0) {
            await teamDoc.ref.update({ roster: spelers });
            console.log(`✅ Roster geüpdatet voor ${team.naam} (${spelers.length} spelers)`);
          }
        } catch (err) {
          console.error(`❌ Fout bij roster sync voor ${team.naam}:`, err);
        }

        // --- 2. KALENDER SYNC ---
        try {
          let fetchUrl = team.wbscTeamUrl;
          const matchUrl = fetchUrl.match(/events\/([^\/]+)\/teams\/([^\/?#]+)/);
          if (matchUrl) {
            fetchUrl = `https://www.baseballsoftball.be/en/events/${matchUrl[1]}/calendars?team=${matchUrl[2]}`;
          }

          const response = await fetch(fetchUrl, {
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          const html = await response.text();
          const $ = cheerio.load(html);

          const matchen: any[] = [];
          let rijen = $('.schedule-item, .game-row');
          if (rijen.length === 0) rijen = $('table tbody tr');

          rijen.each((_, rij) => {
            const $rij = $(rij);
            const rijTekst = $rij.text().replace(/\s+/g, ' ').trim();
            const isScheduleItem = $rij.hasClass('schedule-item');

            if (isScheduleItem) {
              let thuisploeg = '', uitploeg = '', locatie = '', datumStr = '';

              $rij.find('.team-info').each((_, info) => {
                const $info = $(info);
                const type = $info.find('.dugout').text().trim().toLowerCase();
                const naam = $info.find('p:not([class])').text().trim();
                if (type === 'home') thuisploeg = naam;
                else if (type === 'visitor') uitploeg = naam;
              });

              const boxScoreLinkDivs = $rij.find('.box-score-link > div');
              if (boxScoreLinkDivs.length >= 2) {
                const infoP = $(boxScoreLinkDivs[1]).find('p');
                if (infoP.length >= 2) {
                  locatie = $(infoP[0]).text().replace(':', '').trim();
                  datumStr = $(infoP[1]).text().trim();
                }
              }

              let wedstrijdTijd = '14:00';
              let geparsteDatum = new Date();
              const dMatch = datumStr.match(/(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}:\d{2})/);
              if (dMatch) {
                const [_, dag, maand, jaar, t] = dMatch;
                geparsteDatum = new Date(parseInt(jaar, 10), parseInt(maand, 10) - 1, parseInt(dag, 10));
                wedstrijdTijd = t;
                geparsteDatum.setHours(parseInt(t.split(':')[0], 10), parseInt(t.split(':')[1], 10), 0);
              }

              let uitslag = '';
              const scoreText = $rij.find('.baseball-score-bug > div:nth-child(2) p').text().trim();
              if (scoreText) {
                if (scoreText !== '0 : 0') {
                  const parts = scoreText.split(':');
                  if (parts.length === 2) uitslag = `${parts[1].trim()} - ${parts[0].trim()}`;
                  else uitslag = scoreText.replace(':', '-').replace(/\s+/g, ' ');
                } else if (geparsteDatum.getTime() < new Date().getTime()) {
                  uitslag = '0 - 0';
                }
              }

              const isGeannuleerd = rijTekst.toLowerCase().includes('postponed') || rijTekst.toLowerCase().includes('canceled');

              if (thuisploeg && uitploeg) {
                matchen.push({
                  thuisploeg: thuisploeg.replace(/flag/gi, '').trim(), 
                  uitploeg: uitploeg.replace(/flag/gi, '').trim(), 
                  datum: geparsteDatum, tijd: wedstrijdTijd,
                  locatie: locatie || 'Uit', uitslag, geannuleerd: isGeannuleerd
                });
              }
            }
          });

          // Verwerk alle gevonden matchen naar Firestore
          for (const match of matchen) {
            const bestaandeMatch = bestaandeMatchen.find(m => {
              if (m.type !== 'wedstrijd' || m.team !== team.naam) return false;
              let mDatum: Date;
              if (m.datum && typeof m.datum.toDate === 'function') mDatum = m.datum.toDate();
              else if (m.datum && m.datum._seconds) mDatum = new Date(m.datum._seconds * 1000);
              else mDatum = new Date(m.datum);

              return (
                mDatum.getDate() === match.datum.getDate() &&
                mDatum.getMonth() === match.datum.getMonth() &&
                mDatum.getFullYear() === match.datum.getFullYear() &&
                m.thuisploeg === match.thuisploeg &&
                m.uitploeg === match.uitploeg
              );
            });

            if (bestaandeMatch) {
              const behoudUitslag = bestaandeMatch.isHandmatigBewerkt;
              const nieuweUitslag = behoudUitslag ? bestaandeMatch.uitslag : match.uitslag;
              if (bestaandeMatch.uitslag !== nieuweUitslag || bestaandeMatch.tijd !== match.tijd || bestaandeMatch.locatie !== match.locatie) {
                await db.collection('kalender').doc(bestaandeMatch.id).update({ uitslag: nieuweUitslag, tijd: match.tijd, locatie: match.locatie });
                bestaandeMatch.uitslag = nieuweUitslag;
                bestaandeMatch.tijd = match.tijd;
                bestaandeMatch.locatie = match.locatie;
              }
            } else {
              const docRef = await db.collection('kalender').add({
                type: 'wedstrijd', team: team.naam,
                thuisploeg: match.thuisploeg, uitploeg: match.uitploeg,
                datum: admin.firestore.Timestamp.fromDate(match.datum),
                tijd: match.tijd, locatie: match.locatie, uitslag: match.uitslag,
              });
              bestaandeMatchen.push({ id: docRef.id, type: 'wedstrijd', team: team.naam, thuisploeg: match.thuisploeg, uitploeg: match.uitploeg, datum: admin.firestore.Timestamp.fromDate(match.datum), tijd: match.tijd, locatie: match.locatie, uitslag: match.uitslag });
            }
          }
          console.log(`✅ Kalender geüpdatet voor ${team.naam} (${matchen.length} matchen verwerkt)`);

        } catch (err) {
          console.error(`❌ Fout bij kalender sync voor ${team.naam}:`, err);
        }
      }
    }
    console.log("🏆 WBSC Sync volledig afgerond!");
  } catch (error) {
    console.error("Fatale fout in wekelijkse sync:", error);
  }
});