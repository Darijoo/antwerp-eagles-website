import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NieuwsService, NieuwsBericht } from './diensten/nieuws';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-nieuws',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './nieuws.html',
  styleUrl: './nieuws.scss',
})
export class Nieuws implements OnInit {
  private nieuwsService = inject(NieuwsService);
  private cdr = inject(ChangeDetectorRef);

  nieuwsBerichten: NieuwsBericht[] = [];
  isLaden = true;

  ngOnInit() {
    this.nieuwsService.haalLaatsteNieuwsOp().subscribe({
      next: (data) => {
        this.nieuwsBerichten = data.sort(
          (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime(),
        );
        this.isLaden = false;
        this.cdr.detectChanges();
      },
      error: (fout) => {
        console.error('Fout bij ophalen nieuws:', fout);
        this.isLaden = false;
        this.cdr.detectChanges();
      },
    });
  }
}