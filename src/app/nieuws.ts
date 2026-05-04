import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NieuwsService, NieuwsBericht } from './diensten/nieuws';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-nieuws',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  templateUrl: './nieuws.html',
  styleUrl: './nieuws.scss',
})
export class Nieuws implements OnInit {
  private nieuwsService = inject(NieuwsService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  hoofdBericht: NieuwsBericht | null = null;
  overigeBerichten: NieuwsBericht[] = [];
  alleBerichten: NieuwsBericht[] = [];

  zoekTerm = '';

  isLaden = true;

  ngOnInit() {
    this.nieuwsService.haalLaatsteNieuwsOp().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.alleBerichten = data.sort(
          (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime(),
        );
        if (this.alleBerichten.length > 0) {
          this.hoofdBericht = this.alleBerichten[0];
          this.overigeBerichten = this.alleBerichten.slice(1);
        }
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

  // Filtert ALLE berichten als je iets typt in de zoekbalk!
  get gefilterdeBerichten() {
    if (!this.zoekTerm) return [];
    const term = this.zoekTerm.toLowerCase();
    return this.alleBerichten.filter(b => 
      b.titel.toLowerCase().includes(term) || 
      b.samenvatting.toLowerCase().includes(term)
    );
  }

  deelOpWhatsApp(bericht: NieuwsBericht, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const url = window.location.origin + '/nieuws/' + bericht.id;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(bericht.titel + ' - Lees meer op: ' + url)}`, '_blank');
  }
}