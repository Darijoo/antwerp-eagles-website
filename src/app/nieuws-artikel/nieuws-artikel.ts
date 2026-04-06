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
  private route = inject(ActivatedRoute);
  private nieuwsService = inject(NieuwsService);
  private cdr = inject(ChangeDetectorRef);

  artikel: NieuwsBericht | undefined;
  geselecteerdeFoto: string | null = null;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.nieuwsService.haalNieuwsBerichtOp(id).subscribe({
        next: (data) => {
          this.artikel = data;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Fout bij laden artikel:', err),
      });
    }
  }

  openFoto(url: string, event?: Event) {
    if (event) event.preventDefault();
    this.geselecteerdeFoto = url;
  }

  sluitFoto() {
    this.geselecteerdeFoto = null;
  }
}
