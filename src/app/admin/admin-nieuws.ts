import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { NieuwsService, NieuwsBericht } from '../diensten/nieuws';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Component({
  selector: 'app-admin-nieuws',
  standalone: true,
  imports: [AsyncPipe, FormsModule],
  templateUrl: './admin-nieuws.html',
  styleUrls: ['./admin-nieuws.css'],
})
export class AdminNieuws {
  private nieuwsService = inject(NieuwsService);
  private storage = inject(Storage);
  private cdr = inject(ChangeDetectorRef);

  // Data direct ophalen tijdens de initialisatie (dit valt wél binnen de Injection Context)
  nieuwsberichten$: Observable<NieuwsBericht[]> = this.nieuwsService.haalLaatsteNieuwsOp();

  // Status van het formulier
  isAanHetOpslaan = false;
  geselecteerdBestand: File | null = null;
  toonFormulier = false;
  bewerkId: string | null = null;
  nieuwBericht: Omit<NieuwsBericht, 'id'> = {
    titel: '',
    datum: new Date().toISOString().split('T')[0], // Standaard vandaag
    samenvatting: '',
    volledigeText: '',
    afbeeldingUrl: '',
  };

  verwijderBericht(id: string) {
    if (confirm('Weet je zeker dat je dit bericht wilt verwijderen?')) {
      this.nieuwsService.verwijderNieuwsBericht(id).subscribe();
      // Firebase is real-time: de lijst in de tabel ververst direct automatisch!
    }
  }

  toggleFormulier() {
    this.toonFormulier = !this.toonFormulier;
    if (!this.toonFormulier) {
      this.resetFormulier();
    }
  }

  bewerkBericht(bericht: NieuwsBericht) {
    this.bewerkId = bericht.id;
    this.nieuwBericht = {
      titel: bericht.titel,
      datum: bericht.datum,
      samenvatting: bericht.samenvatting,
      volledigeText: bericht.volledigeText,
      afbeeldingUrl: bericht.afbeeldingUrl || '',
    };
    this.toonFormulier = true;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.geselecteerdBestand = file;
      // We gebruiken de FileReader nog steeds om direct een tijdelijke preview te tonen in het formulier
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.nieuwBericht.afbeeldingUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async opslaan() {
    this.isAanHetOpslaan = true;
    try {
      // 1. Upload de afbeelding naar Firebase Storage als er een nieuwe is geselecteerd
      if (this.geselecteerdBestand) {
        const bestandsNaam = `nieuws/${Date.now()}_${this.geselecteerdBestand.name}`;
        const opslagRef = ref(this.storage, bestandsNaam);

        const uploadResultaat = await uploadBytes(opslagRef, this.geselecteerdBestand);
        const downloadUrl = await getDownloadURL(uploadResultaat.ref);

        // Vervang de Base64 tekst met de échte URL van Firebase
        this.nieuwBericht.afbeeldingUrl = downloadUrl;
      }

      // Dit blok handelt de reactie van de database netjes af
      const onSuccess = () => {
        this.isAanHetOpslaan = false;
        this.toonFormulier = false;
        this.resetFormulier();
        this.cdr.detectChanges(); // Vertel Angular expliciet dat het scherm vernieuwd moet worden!
      };

      const dbObserver = {
        next: onSuccess,
        complete: onSuccess, // Vangt het op als de datastream direct sluit
        error: (err: any) => {
          console.error('Fout bij opslaan in database:', err);
          this.isAanHetOpslaan = false; // Reset de knop
          this.cdr.detectChanges();
          alert('Opslaan mislukt! Kijk in de F12 Console voor meer details.');
        },
      };

      // 2. Sla het bericht op in Firestore
      if (this.bewerkId !== null) {
        this.nieuwsService
          .updateNieuwsBericht(this.bewerkId, this.nieuwBericht)
          .subscribe(dbObserver);
      } else {
        this.nieuwsService.voegNieuwsBerichtToe(this.nieuwBericht).subscribe(dbObserver);
      }
    } catch (error) {
      console.error('Fout bij het opslaan:', error);
      alert(
        'Er is een fout opgetreden bij het uploaden van de afbeelding. Heb je Storage ingeschakeld in Firebase?',
      );
      this.isAanHetOpslaan = false;
      this.cdr.detectChanges();
    }
  }

  private resetFormulier() {
    this.bewerkId = null;
    this.geselecteerdBestand = null;
    this.nieuwBericht = {
      titel: '',
      datum: new Date().toISOString().split('T')[0],
      samenvatting: '',
      volledigeText: '',
      afbeeldingUrl: '',
    };
  }
}
