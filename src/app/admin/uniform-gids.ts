import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UniformService, UniformOnderdeel } from '../diensten/uniform';

@Component({
  selector: 'app-uniform-gids',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './uniform-gids.html',
  styleUrl: './uniform-gids.scss',
})
export class UniformGids implements OnInit {
  private uniformService = inject(UniformService);
  private cdr = inject(ChangeDetectorRef);

  onderdelen: UniformOnderdeel[] = [];
  geselecteerdOnderdeel: UniformOnderdeel | null = null;
  actieveCategorie = 'Baseball';
  categorieen = ['Baseball', 'Softball', 'Jeugd'];
  
  afbeeldingen: Record<string, string> = {
    'Baseball': 'https://images.unsplash.com/photo-1508344928928-7165b67de128?auto=format&fit=crop&w=600&q=80',
    'Softball': 'https://images.unsplash.com/photo-1544098485-2a2ed6da40ba?auto=format&fit=crop&w=600&q=80',
    'Jeugd': 'https://images.unsplash.com/photo-1510825316025-a131b7b049d5?auto=format&fit=crop&w=600&q=80'
  };

  ngOnInit() {
    this.uniformService.haalAlleOnderdelenOp().subscribe((data) => {
      this.onderdelen = data;
      if (!this.geselecteerdOnderdeel) {
        this.wisselCategorie(this.actieveCategorie);
      }
      this.cdr.detectChanges();
    });
  }

  get gefilterdeOnderdelen() {
    // Als oude items nog geen categorie hebben, vallen ze standaard onder Baseball
    return this.onderdelen.filter(o => (o.categorie || 'Baseball') === this.actieveCategorie);
  }

  wisselCategorie(cat: string) {
    this.actieveCategorie = cat;
    const items = this.gefilterdeOnderdelen;
    this.geselecteerdOnderdeel = items.length > 0 ? items[0] : null;
  }

  selecteerOnderdeel(onderdeel: UniformOnderdeel) {
    this.geselecteerdOnderdeel = onderdeel;
  }
}
