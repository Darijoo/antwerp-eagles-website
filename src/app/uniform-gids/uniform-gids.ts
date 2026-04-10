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
  categorieen = ['Baseball', 'Softball'];
  
  afbeeldingen: Record<string, string> = {
    'Baseball': 'https://images.unsplash.com/photo-1508344928928-7165b67de128?auto=format&fit=crop&w=600&q=80',
    'Softball': 'https://images.unsplash.com/photo-1544098485-2a2ed6da40ba?auto=format&fit=crop&w=600&q=80'
  };

  ngOnInit() {
    // Haal de geüploade foto's op uit de database
    this.uniformService.haalAfbeeldingenOp().subscribe((fotos: Record<string, string>) => {
      if (fotos) {
        this.afbeeldingen = { ...this.afbeeldingen, ...fotos };
        this.cdr.detectChanges();
      }
    });

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

  get verplichteOnderdelen() {
    return this.gefilterdeOnderdelen.filter(o => o.verplicht).sort((a, b) => a.naam.localeCompare(b.naam));
  }

  get optioneleOnderdelen() {
    return this.gefilterdeOnderdelen.filter(o => !o.verplicht).sort((a, b) => a.naam.localeCompare(b.naam));
  }

  get alleOnderdelenGesorteerd() {
    return [...this.verplichteOnderdelen, ...this.optioneleOnderdelen];
  }

  get actieveWinkels() {
    if (!this.geselecteerdOnderdeel) return [];
    
    if (this.geselecteerdOnderdeel.winkels && this.geselecteerdOnderdeel.winkels.length > 0) {
      const geldigeWinkels = this.geselecteerdOnderdeel.winkels.filter(w => w.naam && w.naam.trim() !== '');
      if (geldigeWinkels.length > 0) return geldigeWinkels;
    }
    
    if (this.geselecteerdOnderdeel.winkelNaam && this.geselecteerdOnderdeel.winkelNaam.trim() !== '') {
      return [{ 
        naam: this.geselecteerdOnderdeel.winkelNaam, 
        link: this.geselecteerdOnderdeel.winkelLink || '' 
      }];
    }
    
    return [];
  }

  wisselCategorie(cat: string) {
    this.actieveCategorie = cat;
    // Kies standaard het eerste verplichte item, of anders het eerste optionele
    const items = this.alleOnderdelenGesorteerd;
    this.geselecteerdOnderdeel = items.length > 0 ? items[0] : null;
  }

  selecteerOnderdeel(onderdeel: UniformOnderdeel) {
    this.geselecteerdOnderdeel = onderdeel;
    
    // Smart Auto-Scroll voor mobiele apparaten (viewport < 768px)
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        document.getElementById('detailsKaart')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150); // Kleine vertraging om de animatie de tijd te geven
    }
  }
}
