import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KalenderService, Match } from '../diensten/kalender.service';
import { Observable, map } from 'rxjs';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-evenementen',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './evenementen.html',
  styleUrls: ['./evenementen.scss']
})
export class Evenementen implements OnInit {
  private kalenderService = inject(KalenderService);
  evenementen$!: Observable<Match[]>;

  ngOnInit() {
    this.evenementen$ = this.kalenderService.haalAlleWedstrijdenOp().pipe(
      map(wedstrijden => wedstrijden
        .filter(w => w.type === 'evenement' && !this.isGespeeld(w.datum))
        .sort((a, b) => this.getDatum(a.datum).getTime() - this.getDatum(b.datum).getTime())
      )
    );
  }

  isGespeeld(datum: any): boolean {
    const wedstrijdDatum = this.getDatum(datum);
    const vandaag = new Date();
    vandaag.setHours(0, 0, 0, 0);
    return wedstrijdDatum < vandaag;
  }

  getDatum(datum: any): Date {
    return datum && typeof datum.toDate === 'function' ? datum.toDate() : new Date(datum);
  }

  getGoogleMapsLink(locatie: string): string {
    if (!locatie) return '#';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locatie)}`;
  }
}
