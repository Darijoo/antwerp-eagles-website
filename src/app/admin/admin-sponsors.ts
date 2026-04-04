import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { SponsorService, Sponsor } from '../diensten/sponsor';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-admin-sponsors',
  standalone: true,
  imports: [AsyncPipe, FormsModule],
  templateUrl: './admin-sponsors.html',
  styleUrls: ['./admin-sponsors.css'],
})
export class AdminSponsors {
  private sponsorService = inject(SponsorService);
  private storage = inject(Storage);
  private cdr = inject(ChangeDetectorRef);

  // Pas de methodenaam aan indien nodig (bijv. haalAlleSponsorsOp)
  sponsors$: Observable<Sponsor[]> = this.sponsorService
    .haalAlleSponsorsOp()
    .pipe(map((sponsors) => sponsors.sort((a, b) => a.naam.localeCompare(b.naam))));

  // Status van het formulier
  isAanHetOpslaan = false;
  geselecteerdBestand: File | null = null;
  toonFormulier = false;
  bewerkId: string | null = null;

  // Zorg dat deze velden overeenkomen met je Sponsor interface in sponsor.ts
  nieuweSponsor: Omit<Sponsor, 'id'> = {
    naam: '',
    websiteUrl: '',
    afbeeldingUrl: '',
  };

  verwijderSponsor(id: string) {
    if (confirm('Weet je zeker dat je deze sponsor wilt verwijderen?')) {
      this.sponsorService.verwijderSponsor(id).subscribe();
    }
  }

  toggleFormulier() {
    this.toonFormulier = !this.toonFormulier;
    if (!this.toonFormulier) {
      this.resetFormulier();
    }
  }

  bewerkSponsor(sponsor: Sponsor) {
    this.bewerkId = sponsor.id;
    this.nieuweSponsor = {
      naam: sponsor.naam,
      websiteUrl: sponsor.websiteUrl || '',
      afbeeldingUrl: sponsor.afbeeldingUrl || '',
    };
    this.toonFormulier = true;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.geselecteerdBestand = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.nieuweSponsor.afbeeldingUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async opslaan() {
    this.isAanHetOpslaan = true;
    try {
      // Upload de afbeelding naar de /sponsors map in Firebase Storage
      if (this.geselecteerdBestand) {
        const bestandsNaam = `sponsors/${Date.now()}_${this.geselecteerdBestand.name}`;
        const opslagRef = ref(this.storage, bestandsNaam);
        const uploadResultaat = await uploadBytes(opslagRef, this.geselecteerdBestand);
        this.nieuweSponsor.afbeeldingUrl = await getDownloadURL(uploadResultaat.ref);
      }

      const onSuccess = () => {
        this.isAanHetOpslaan = false;
        this.toonFormulier = false;
        this.resetFormulier();
        this.cdr.detectChanges(); // Ververs het scherm
      };

      if (this.bewerkId !== null) {
        this.sponsorService.updateSponsor(this.bewerkId, this.nieuweSponsor).subscribe(onSuccess);
      } else {
        this.sponsorService.voegSponsorToe(this.nieuweSponsor).subscribe(onSuccess);
      }
    } catch (error) {
      console.error('Fout bij het opslaan:', error);
      alert('Er is een fout opgetreden bij het uploaden van het logo.');
      this.isAanHetOpslaan = false;
      this.cdr.detectChanges();
    }
  }

  private resetFormulier() {
    this.bewerkId = null;
    this.geselecteerdBestand = null;
    this.nieuweSponsor = { naam: '', websiteUrl: '', afbeeldingUrl: '' };
  }
}
