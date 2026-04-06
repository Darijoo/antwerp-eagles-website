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
  maandNaam = '';
  jaar = 0;

  // Filters
  geselecteerdType = '';
  geselecteerdTeam = '';
  beschikbareTeams: string[] = [];

  // Voor de desktop raster weergave
  kalenderDagen: { datum: Date; isHuidigeMaand: boolean; events: Match[] }[] = [];
  // Voor de mobiele lijst weergave
  maandEvents: Match[] = [];

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
      this.cdr.detectChanges(); // Vertel Angular dwingend om het scherm NU te updaten
    });
  }

  onFilterWijziging() {
    // Als we "Evenementen" kiezen, heeft filteren op team geen zin
    if (this.geselecteerdType === 'evenement') {
      this.geselecteerdTeam = '';
    }
    this.genereerKalender();
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
    const gefilterdeWedstrijden = this.alleWedstrijden.filter((w) => {
      const matchType =
        this.geselecteerdType === '' || (w.type || 'wedstrijd') === this.geselecteerdType;
      const matchTeam = this.geselecteerdTeam === '' || w.team === this.geselecteerdTeam;
      return matchType && matchTeam;
    });

    this.kalenderDagen = [];
    for (let i = 0; i < 42; i++) {
      // 6 rijen van 7 dagen = 42 vakjes
      const datum = new Date(startDatum);
      datum.setDate(startDatum.getDate() + i);

      const isHuidigeMaand = datum.getMonth() === maand;
      const events = gefilterdeWedstrijden.filter((w) => {
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
    this.maandEvents = gefilterdeWedstrijden
      .filter(
        (w) =>
          w.datum.toDate().getMonth() === maand && w.datum.toDate().getFullYear() === this.jaar,
      )
      .sort((a, b) => a.datum.toDate().getTime() - b.datum.toDate().getTime());
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

  // Bepaalt of een wedstrijd een thuismatch is
  isThuisMatch(match: Match): boolean {
    return match.thuisploeg ? match.thuisploeg.toLowerCase().includes('eagle') : false;
  }
}
