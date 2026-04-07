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
    this.nieuwOnderdeel = { ...onderdeel };
    this.toonFormulier = true;
  }

  verwijderOnderdeel(id: string) {
    if (confirm('Weet je zeker dat je dit kledingstuk definitief wilt verwijderen?')) {
      this.uniformService.verwijderOnderdeel(id).subscribe();
    }
  }

  opslaan() {
    this.isAanHetOpslaan = true;
    const onSuccess = () => {
      this.isAanHetOpslaan = false;
      this.toonFormulier = false;
      this.resetFormulier();
      this.cdr.detectChanges();
    };

    if (this.bewerkId) {
      this.uniformService.updateOnderdeel(this.bewerkId, this.nieuwOnderdeel).subscribe(onSuccess);
    } else {
      this.uniformService.voegOnderdeelToe(this.nieuwOnderdeel).subscribe(onSuccess);
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
      top: 50,
      left: 50,
      categorie: 'Baseball',
    };
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
