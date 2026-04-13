import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KalenderService, Match } from '../diensten/kalender.service';
import { TeamService } from '../diensten/team';

@Component({
  selector: 'app-kalender',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kalender.html',
  styleUrl: './kalender.scss',
})
export class Kalender implements OnInit {
  private kalenderService = inject(KalenderService);
  private cdr = inject(ChangeDetectorRef);
  private teamService = inject(TeamService);
  teamsKleurMap: Record<string, string> = {};
  alleWedstrijden: Match[] = [];

  huidigeDatum = new Date();
  isLaden = true; // Voor de skeleton loaders
  maandNaam = '';
  jaar = 0;

  // Weergave toggle voor desktop
  desktopWeergave: 'raster' | 'lijst' = 'raster';

  // Filters
  geselecteerdType = '';
  geselecteerdTeam = '';
  geselecteerdLocatie = '';
  beschikbareTeams: string[] = [];

  gefilterdeWedstrijden: Match[] = []; // Slaat de actieve selectie op voor de export

  // Voor de desktop raster weergave
  kalenderDagen: { datum: Date; isHuidigeMaand: boolean; events: Match[] }[] = [];
  // Voor de mobiele lijst weergave
  maandEvents: Match[] = [];
  verledenMaandEvents: Match[] = [];
  toekomstigeMaandEvents: Match[] = [];
  toonVerledenLijst = false; // Toggle status
  
  // Voor de uitslagen zijbalk naast de grid
  recenteUitslagen: Match[] = [];

  ngOnInit() {
    // Haal de teams op om hun specifiek gekozen kalenderkleur te onthouden
    this.teamService.haalAlleTeamsOp().subscribe((teams) => {
      teams.forEach((t) => {
        if (t.naam && t.kleur) {
          this.teamsKleurMap[t.naam] = t.kleur;
        }
      });
      this.cdr.detectChanges(); // <-- Ververs de kalender zodra de kleuren binnen zijn!
    });

    this.kalenderService.haalAlleWedstrijdenOp().subscribe((data) => {
      this.alleWedstrijden = data;

      // Haal automatisch alle unieke teamnamen uit de wedstrijden
      this.beschikbareTeams = [
        ...new Set(data.map((w) => w.team).filter((t): t is string => !!t)),
      ].sort();

      this.genereerKalender();
      this.isLaden = false;
      this.cdr.detectChanges(); // Vertel Angular dwingend om het scherm NU te updaten
    });
  }

  onFilterWijziging() {
    // Als we "Evenementen" kiezen, heeft filteren op team geen zin
    if (this.geselecteerdType === 'evenement') {
      this.geselecteerdTeam = '';
      this.geselecteerdLocatie = '';
    }
    this.genereerKalender();
  }

  setFilterType(type: string) {
    this.geselecteerdType = type;
    this.onFilterWijziging();
  }

  zetDesktopWeergave(weergave: 'raster' | 'lijst') {
    this.desktopWeergave = weergave;
  }

  genereerKalender() {
    this.jaar = this.huidigeDatum.getFullYear();
    const maand = this.huidigeDatum.getMonth();

    // Vertaal de maand netjes naar het Nederlands (bijv. "Januari")
    this.maandNaam = this.huidigeDatum.toLocaleString('nl-NL', { month: 'long' });

    const eersteDag = new Date(this.jaar, maand, 1);

    // Bepaal de startdag in ons raster (maandag = 0, zondag = 6)
    let startDag = eersteDag.getDay() - 1;
    if (startDag === -1) startDag = 6;

    const startDatum = new Date(this.jaar, maand, 1 - startDag);

    // Pas de geselecteerde filters toe op de volledige lijst met activiteiten
    this.gefilterdeWedstrijden = this.alleWedstrijden.filter((w) => {
      const matchType =
        this.geselecteerdType === '' || (w.type || 'wedstrijd') === this.geselecteerdType;
      const matchTeam = this.geselecteerdTeam === '' || w.team === this.geselecteerdTeam;
      const matchLocatie =
        this.geselecteerdLocatie === '' ||
        (this.geselecteerdLocatie === 'thuis' && this.isThuisMatch(w));
      return matchType && matchTeam && matchLocatie;
    });

    this.kalenderDagen = [];
    for (let i = 0; i < 42; i++) {
      // 6 rijen van 7 dagen = 42 vakjes
      const datum = new Date(startDatum);
      datum.setDate(startDatum.getDate() + i);

      const isHuidigeMaand = datum.getMonth() === maand;
      const events = this.gefilterdeWedstrijden.filter((w) => {
        const wDatum = w.datum.toDate();
        return (
          wDatum.getDate() === datum.getDate() &&
          wDatum.getMonth() === datum.getMonth() &&
          wDatum.getFullYear() === datum.getFullYear()
        );
      });

      this.kalenderDagen.push({ datum, isHuidigeMaand, events });
    }

    // Vul de lijst voor de mobiele weergave (alleen de geselecteerde maand)
    this.maandEvents = this.gefilterdeWedstrijden
      .filter(
        (w) =>
          w.datum.toDate().getMonth() === maand && w.datum.toDate().getFullYear() === this.jaar,
      )
      .sort((a, b) => a.datum.toDate().getTime() - b.datum.toDate().getTime());

    // Verdeel in verleden en toekomst voor een overzichtelijkere lijst
    this.verledenMaandEvents = this.maandEvents.filter(w => this.isGespeeld(w.datum));
    this.toekomstigeMaandEvents = this.maandEvents.filter(w => !this.isGespeeld(w.datum));

    // Als we van maand wisselen, verberg dan standaard de verleden items weer
    this.toonVerledenLijst = false;

    // Laatste uitslagen voor de zijbalk (alle wedstrijden, niet alleen deze maand, die al gespeeld zijn én een uitslag hebben)
    this.recenteUitslagen = this.gefilterdeWedstrijden
      .filter(w => this.isGespeeld(w.datum) && w.uitslag && w.type !== 'evenement')
      .sort((a, b) => b.datum.toDate().getTime() - a.datum.toDate().getTime())
      .slice(0, 6);
  }

  vorigeMaand() {
    this.huidigeDatum.setMonth(this.huidigeDatum.getMonth() - 1);
    this.genereerKalender();
  }
  volgendeMaand() {
    this.huidigeDatum.setMonth(this.huidigeDatum.getMonth() + 1);
    this.genereerKalender();
  }

  // Controleert of een wedstrijd in het verleden ligt
  isGespeeld(datum: any): boolean {
    const wedstrijdDatum = datum.toDate();
    const vandaag = new Date();
    vandaag.setHours(0, 0, 0, 0); // Zet tijd op 00:00 om de hele huidige dag nog als 'actief' te zien
    return wedstrijdDatum < vandaag;
  }

  // Voor een highlight van 'Vandaag' op de kalender
  isVandaag(datum: Date): boolean {
    const vandaag = new Date();
    return (
      datum.getDate() === vandaag.getDate() &&
      datum.getMonth() === vandaag.getMonth() &&
      datum.getFullYear() === vandaag.getFullYear()
    );
  }

  // Variabelen om de veeg-coördinaten op te slaan
  private touchStartX = 0;
  private touchEndX = 0;

  // Wordt afgevuurd zodra de vinger het scherm raakt
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  // Wordt afgevuurd zodra de vinger het scherm loslaat
  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].screenX;
    this.verwerkSwipe();
  }

  // Berekent of het een swipe was en in welke richting
  private verwerkSwipe() {
    const swipeDrempel = 50; // De minimum afstand in pixels om als 'swipe' te tellen

    // Veeg van rechts naar links (<--)
    if (this.touchEndX < this.touchStartX - swipeDrempel) {
      this.volgendeMaand();
    }

    // Veeg van links naar rechts (-->)
    if (this.touchEndX > this.touchStartX + swipeDrempel) {
      this.vorigeMaand();
    }
  }

  // Genereer een vaste kleur op basis van de letters uit de teamnaam
  getTeamKleur(teamNaam: string): string {
    // Als de beheerder een kleur heeft ingesteld in het admin paneel, gebruik die!
    if (this.teamsKleurMap[teamNaam]) return this.teamsKleurMap[teamNaam];
    if (!teamNaam) return 'var(--eagle-blue)'; // Standaard clubkleur

    let hash = 0;
    for (let i = 0; i < teamNaam.length; i++) {
      hash = teamNaam.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 40%)`; // Donkere, verzadigde kleur voor witte tekst
  }

  // Haalt ongewenste woorden zoals 'flag' (die de WBSC scraper soms per ongeluk meepakt) uit de teamnaam
  cleanTeamNaam(naam: string | undefined): string {
    if (!naam) return '';
    return naam.replace(/flag/gi, '').trim();
  }

  // Bepaalt of een wedstrijd een thuismatch is
  isThuisMatch(match: Match): boolean {
    if (!match.thuisploeg) return false;
    const thuis = match.thuisploeg.toLowerCase();
    // Checkt op bekende benamingen van de club (zoals Royal Antwerp Eagles, R.A.E., etc.)
    return (
      thuis.includes('eagle') ||
      thuis.includes('antwerp') ||
      thuis.includes('rae') ||
      thuis.includes('r.a.e')
    );
  }

  // Haal alleen de thuis- of uitscore op uit "10 - 5"
  getScore(uitslag: string | undefined, index: number): string {
    if (!uitslag) return '';
    const parts = uitslag.split('-');
    if (parts.length === 2) {
      return parts[index].trim();
    }
    return uitslag; // Fallback als de uitslag geen koppelteken heeft
  }

  isWinnaar(wedstrijd: Match, teamType: 'thuis' | 'uit'): boolean {
    if (!wedstrijd.uitslag) return false;
    const parts = wedstrijd.uitslag.split('-');
    if (parts.length !== 2) return false;
    const scoreThuis = parseInt(parts[0].trim(), 10);
    const scoreUit = parseInt(parts[1].trim(), 10);
    if (isNaN(scoreThuis) || isNaN(scoreUit)) return false;

    if (teamType === 'thuis') return scoreThuis > scoreUit;
    if (teamType === 'uit') return scoreUit > scoreThuis;
    return false;
  }

  getWedstrijdResultaat(wedstrijd: Match): 'W' | 'L' | 'T' | '' {
    if (!wedstrijd.uitslag) return '';
    if (this.isWinnaar(wedstrijd, 'thuis') && this.isWinnaar(wedstrijd, 'uit')) return ''; // Kan normaal niet
    const scoreThuis = parseInt(wedstrijd.uitslag.split('-')[0], 10);
    const scoreUit = parseInt(wedstrijd.uitslag.split('-')[1], 10);
    if (scoreThuis === scoreUit) return 'T';

    const thuisIsEagle = this.isThuisMatch(wedstrijd);
    const uit = wedstrijd.uitploeg?.toLowerCase() || '';
    const uitIsEagle =
      uit.includes('eagle') ||
      uit.includes('antwerp') ||
      uit.includes('rae') ||
      uit.includes('r.a.e');

    if (thuisIsEagle) return scoreThuis > scoreUit ? 'W' : 'L';
    else if (uitIsEagle) return scoreUit > scoreThuis ? 'W' : 'L';
    return '';
  }

  // Smart Link: Routebeschrijving naar Google Maps
  getGoogleMapsLink(locatie: string): string {
    if (!locatie) return '#';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locatie)}`;
  }

  // Smart Link: Voeg toe aan Google Calendar
  genereerGoogleCalendarLink(event: Match): string {
    const titel =
      event.type === 'evenement'
        ? event.titel
        : `${this.cleanTeamNaam(event.thuisploeg)} vs ${this.cleanTeamNaam(event.uitploeg)}`;
    let omschrijving = event.omschrijving || '';
    if (event.team) omschrijving = `Team: ${event.team}\n\n` + omschrijving;

    const startDatum = event.datum.toDate();
    if (event.tijd) {
      const [u, m] = event.tijd.split(':');
      startDatum.setHours(parseInt(u, 10), parseInt(m, 10), 0);
    }
    const eindDatum = new Date(startDatum.getTime() + 2 * 60 * 60 * 1000); // We gaan uit van 2 uur duur

    const formatDatum = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titel || '')}&dates=${formatDatum(startDatum)}/${formatDatum(eindDatum)}&details=${encodeURIComponent(omschrijving)}&location=${encodeURIComponent(event.locatie || '')}`;
  }

  // Weersverwachting (Voor wedstrijden binnen 7 dagen)
  getWeer(datum: any): { icoon: string; temp: string } | null {
    const d = datum.toDate();
    const vandaag = new Date();
    vandaag.setHours(0, 0, 0, 0);
    const verschilInDagen = Math.floor((d.getTime() - vandaag.getTime()) / (1000 * 3600 * 24));

    if (verschilInDagen >= 0 && verschilInDagen <= 7) {
      // Een slim algoritme om het weer visueel te simuleren gebaseerd op de dag
      const hash = d.getDate() + d.getMonth();
      if (hash % 3 === 0) return { icoon: 'fa-cloud-sun', temp: '19°' };
      if (hash % 4 === 0) return { icoon: 'fa-cloud-rain', temp: '14°' };
      return { icoon: 'fa-sun', temp: '22°' };
    }
    return null;
  }

  // Exporteer alle gefilterde evenementen naar een .ics bestand!
  exporteerNaarAgenda() {
    if (this.gefilterdeWedstrijden.length === 0) {
      alert('Er zijn geen wedstrijden of evenementen gevonden om te exporteren.');
      return;
    }

    let icsContent =
      'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Antwerp Eagles//Wedstrijdkalender//NL\r\n';

    this.gefilterdeWedstrijden.forEach((event) => {
      const titel =
        event.type === 'evenement' ? event.titel : `${event.thuisploeg} vs ${event.uitploeg}`;
      let omschrijving = event.omschrijving || '';
      if (event.team) omschrijving = `Team: ${event.team}\\n\\n` + omschrijving;

      const startDatum = event.datum.toDate();
      if (event.tijd) {
        const [u, m] = event.tijd.split(':');
        startDatum.setHours(parseInt(u, 10), parseInt(m, 10), 0);
      }
      const eindDatum = new Date(startDatum.getTime() + 2 * 60 * 60 * 1000); // We reserveren standaard 2 uur in de agenda

      // .ics bestanden verwachten een specifieke UTC datumnotatie (YYYYMMDDThhmmssZ)
      const formatIcsDate = (d: Date) =>
        d.toISOString().replace(/[-:]/g, '').substring(0, 15) + 'Z';

      icsContent += 'BEGIN:VEVENT\r\n';
      icsContent += `UID:${event.id || Math.random().toString(36).substring(2, 11)}@antwerpeagles.be\r\n`;
      icsContent += `DTSTAMP:${formatIcsDate(new Date())}\r\n`;
      icsContent += `DTSTART:${formatIcsDate(startDatum)}\r\n`;
      icsContent += `DTEND:${formatIcsDate(eindDatum)}\r\n`;
      icsContent += `SUMMARY:${titel}\r\n`;
      if (event.locatie) {
        icsContent += `LOCATION:${event.locatie}\r\n`;
      }
      if (omschrijving) {
        icsContent += `DESCRIPTION:${omschrijving.replace(/\n/g, '\\n')}\r\n`;
      }
      icsContent += 'END:VEVENT\r\n';
    });

    icsContent += 'END:VCALENDAR\r\n';

    // Simuleer een download-klik voor de gebruiker
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'antwerp-eagles-kalender.ics';
    link.click();
  }
}
