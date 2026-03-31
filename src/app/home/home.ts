import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // <-- 1. Importeer de ChangeDetectorRef
import { RouterLink } from '@angular/router';
import { NieuwsService, NieuwsBericht } from '../diensten/nieuws';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private nieuwsService = inject(NieuwsService);
  private cdr = inject(ChangeDetectorRef); // <-- 2. Haal de 'schilder' naar binnen

  laatsteNieuws: NieuwsBericht[] = [];

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
