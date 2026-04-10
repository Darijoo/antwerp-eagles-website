import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { UniformService, UniformOnderdeel } from '../diensten/uniform';
import { Observable, firstValueFrom } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Component({
  selector: 'app-admin-uniform',
  standalone: true,
  imports: [AsyncPipe, FormsModule],
  templateUrl: './admin-uniform.html',
  styleUrls: ['./admin-uniform.css'],
})
export class AdminUniform {
  private uniformService = inject(UniformService);
  private cdr = inject(ChangeDetectorRef);
  private storage = inject(Storage);

  onderdelen$: Observable<UniformOnderdeel[]> = this.uniformService.haalAlleOnderdelenOp().pipe(
    map(items => items.sort((a, b) => {
      if (a.categorie !== b.categorie) return (a.categorie || '').localeCompare(b.categorie || '');
      if (a.verplicht && !b.verplicht) return -1;
      if (!a.verplicht && b.verplicht) return 1;
      return a.naam.localeCompare(b.naam);
    }))
  );
  afbeeldingen$: Observable<Record<string, string>> = this.uniformService.haalAfbeeldingenOp();
  huidigeAfbeeldingen: Record<string, string> = {};

  isAanHetOpslaan = false;
  toonFormulier = false;
  bewerkId: string | null = null;
  
  geselecteerdeCategorieFoto = 'Baseball';
  geselecteerdeFoto: File | null = null;
  isFotoAanHetOpslaan = false;

  constructor() {
    this.afbeeldingen$.subscribe((data) => {
      if (data) this.huidigeAfbeeldingen = data;
    });
  }

  nieuwOnderdeel: UniformOnderdeel = {
    naam: '',
    beschrijving: '',
    verplicht: true,
    prijsIndicatie: null,
    winkelNaam: '',
    winkelLink: '',
    winkels: [{ naam: '', link: '' }], // Start met één leeg winkelveld
    top: 50,
    left: 50,
    categorie: 'Baseball',
  };

  toggleFormulier() {
    this.toonFormulier = !this.toonFormulier;
    if (!this.toonFormulier) this.resetFormulier();
  }

  bewerkOnderdeel(onderdeel: UniformOnderdeel) {
    this.bewerkId = onderdeel.id || null;
    // Diepe kopie zodat live typen (en dan annuleren) de tabel niet per ongeluk wijzigt!
    this.nieuwOnderdeel = JSON.parse(JSON.stringify(onderdeel));
    
    // Migratie: Als er nog geen winkels array is, maar wel een oude enkele winkel, voeg deze dan toe
    if (!this.nieuwOnderdeel.winkels || this.nieuwOnderdeel.winkels.length === 0) {
      this.nieuwOnderdeel.winkels = [];
      if (this.nieuwOnderdeel.winkelNaam && this.nieuwOnderdeel.winkelLink) {
        this.nieuwOnderdeel.winkels.push({ 
          naam: this.nieuwOnderdeel.winkelNaam, 
          link: this.nieuwOnderdeel.winkelLink 
        });
      } else {
        // Zorg dat er altijd minimaal 1 leeg veld staat om te kunnen bewerken
        this.nieuwOnderdeel.winkels.push({ naam: '', link: '' });
      }
    }
    this.toonFormulier = true;
  }

  verwijderOnderdeel(id: string) {
    if (confirm('Weet je zeker dat je dit kledingstuk definitief wilt verwijderen?')) {
      this.uniformService.verwijderOnderdeel(id).subscribe();
    }
  }

  opslaan() {
    this.isAanHetOpslaan = true;

    // Maak een schone kopie voor de database
    const dataOmTeOpslaan = { ...this.nieuwOnderdeel };
    delete dataOmTeOpslaan.id; // Voorkom dat we het Firebase ID overschrijven met zichzelf

    // Verwijder eventuele lege winkels (waar géén naam is ingevuld) voordat we opslaan
    if (dataOmTeOpslaan.winkels) {
      dataOmTeOpslaan.winkels = dataOmTeOpslaan.winkels.filter(
        w => w.naam && w.naam.trim() !== ''
      );
    }

    let isSuccessGeroepen = false;
    const onSuccess = () => {
      if (isSuccessGeroepen) return;
      isSuccessGeroepen = true;
      this.isAanHetOpslaan = false;
      this.toonFormulier = false;
      this.resetFormulier();
      this.cdr.detectChanges();
    };

    const dbObserver = {
      next: onSuccess,
      complete: onSuccess,
      error: (err: any) => {
        console.error('Fout bij opslaan in database:', err);
        alert('Oeps, het opslaan is mislukt! Kijk in de F12 Console voor meer details.');
        this.isAanHetOpslaan = false;
        this.cdr.detectChanges();
      }
    };

    if (this.bewerkId) {
      this.uniformService.updateOnderdeel(this.bewerkId, dataOmTeOpslaan).subscribe(dbObserver);
    } else {
      this.uniformService.voegOnderdeelToe(dataOmTeOpslaan).subscribe(dbObserver);
    }
  }

  private resetFormulier() {
    this.bewerkId = null;
    this.nieuwOnderdeel = {
      naam: '',
      beschrijving: '',
      verplicht: true,
      prijsIndicatie: null,
      winkelNaam: '',
      winkelLink: '',
      winkels: [{ naam: '', link: '' }],
      top: 50,
      left: 50,
      categorie: 'Baseball',
    };
  }

  voegWinkelToe() {
    const huidigeWinkels = this.nieuwOnderdeel.winkels || [];
    this.nieuwOnderdeel.winkels = [...huidigeWinkels, { naam: '', link: '' }];
    this.cdr.detectChanges();
  }

  verwijderWinkel(index: number) {
    if (this.nieuwOnderdeel.winkels) {
      const huidigeWinkels = [...this.nieuwOnderdeel.winkels];
      huidigeWinkels.splice(index, 1);
      this.nieuwOnderdeel.winkels = huidigeWinkels;
      this.cdr.detectChanges();
    }
  }

  onFotoSelected(event: any) {
    this.geselecteerdeFoto = event.target.files[0] || null;
  }

  async uploadFoto() {
    if (!this.geselecteerdeFoto) return;
    
    this.isFotoAanHetOpslaan = true;
    this.cdr.detectChanges();

    try {
      const bestandsNaam = `uniform/${this.geselecteerdeCategorieFoto}_${Date.now()}_${this.geselecteerdeFoto.name}`;
      const opslagRef = ref(this.storage, bestandsNaam);
      
      const uploadResultaat = await uploadBytes(opslagRef, this.geselecteerdeFoto);
      const url = await getDownloadURL(uploadResultaat.ref);

      await firstValueFrom(this.uniformService.updateAfbeelding(this.geselecteerdeCategorieFoto, url));

      this.geselecteerdeFoto = null;
      alert('Achtergrondfoto succesvol geüpdatet!');
    } catch (error) {
      console.error('Fout bij uploaden foto:', error);
      alert('Er ging iets mis bij het uploaden van de foto.');
    }

    this.isFotoAanHetOpslaan = false;
    this.cdr.detectChanges();
  }
}
