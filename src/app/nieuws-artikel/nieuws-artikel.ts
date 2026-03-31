import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NieuwsService, NieuwsBericht } from '../diensten/nieuws';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-nieuws-artikel',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './nieuws-artikel.html',
  styleUrl: './nieuws-artikel.scss',
})
export class NieuwsArtikel implements OnInit {
  route = inject(ActivatedRoute);
  private nieuwsService = inject(NieuwsService);
  private cdr = inject(ChangeDetectorRef); // De schilder weer naar binnen halen!

  actueelBericht: NieuwsBericht | undefined;

  ngOnInit() {
    // 1. Haal het ID uit de adresbalk.
    const idFromUrl = this.route.snapshot.paramMap.get('id');

    // Zorg dat we écht een ID hebben.
    if (idFromUrl) {
      // 2. Vraag dit specifieke bericht op bij de NieuwsService.
      this.nieuwsService.haalNieuwsBerichtOp(idFromUrl).subscribe({
        next: (data) => {
          this.actueelBericht = data;
          this.cdr.detectChanges(); // Dwing Angular om direct te updaten!
        },
        error: (fout) => {
          console.error('Oeps, kon het bericht niet vinden:', fout);
        },
      });
    }
  }
}
