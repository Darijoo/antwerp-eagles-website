import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // <-- 1. Importeer de ChangeDetectorRef
import { RouterLink } from '@angular/router';
import { NieuwsService, NieuwsBericht } from '../diensten/nieuws';
import { DatePipe, AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { KalenderService, Match } from '../diensten/kalender.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DatePipe, AsyncPipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private nieuwsService = inject(NieuwsService);
  private cdr = inject(ChangeDetectorRef); // <-- 2. Haal de 'schilder' naar binnen
  private kalenderService = inject(KalenderService);

  laatsteNieuws: NieuwsBericht[] = [];
  aankomendeActiviteiten$: Observable<Match[]>;

  constructor() {
    this.aankomendeActiviteiten$ = this.kalenderService.haalAlleWedstrijdenOp().pipe(
      map((matches) => {
        const vandaag = new Date();
        vandaag.setHours(0, 0, 0, 0); // Negeer de tijd, we kijken alleen naar de dag

        return matches
          .filter((m) => m.datum.toDate() >= vandaag) // Bewaar alleen wedstrijden in de toekomst
          .sort((a, b) => a.datum.toDate().getTime() - b.datum.toDate().getTime()) // Sorteer op datum: dichtstbijzijnde eerst
          .slice(0, 3); // Laat maximaal 3 kaartjes tegelijk zien op de homepagina
      }),
    );
  }

  ngOnInit() {
    this.nieuwsService.haalLaatsteNieuwsOp().subscribe({
      next: (data) => {
        this.laatsteNieuws = data; // Stop de data erin
        this.cdr.detectChanges(); // <-- 3. DWING Angular om de HTML NU opnieuw te tekenen!
      },
      error: (fout) => {
        console.error('Oeps, we konden Strapi niet bereiken:', fout);
      },
    });
  }
}
