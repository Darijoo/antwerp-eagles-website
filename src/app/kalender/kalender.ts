import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KalenderService, Match } from '../diensten/kalender.service';

@Component({
  selector: 'app-kalender',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kalender.html',
  styleUrl: './kalender.scss',
})
export class Kalender implements OnInit {
  private kalenderService = inject(KalenderService);
  alleWedstrijden: Match[] = [];

  huidigeDatum = new Date();
  maandNaam = '';
  jaar = 0;

  // Voor de desktop raster weergave
  kalenderDagen: { datum: Date; isHuidigeMaand: boolean; events: Match[] }[] = [];
  // Voor de mobiele lijst weergave
  maandEvents: Match[] = [];

  ngOnInit() {
    this.kalenderService.haalAlleWedstrijdenOp().subscribe((data) => {
      this.alleWedstrijden = data;
      this.genereerKalender();
    });
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

    this.kalenderDagen = [];
    for (let i = 0; i < 42; i++) {
      // 6 rijen van 7 dagen = 42 vakjes
      const datum = new Date(startDatum);
      datum.setDate(startDatum.getDate() + i);

      const isHuidigeMaand = datum.getMonth() === maand;
      const events = this.alleWedstrijden.filter((w) => {
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
    this.maandEvents = this.alleWedstrijden
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
}
