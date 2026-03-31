import { Component, OnInit, inject } from '@angular/core';
import { SponsorService, Sponsor } from '../diensten/sponsor';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-sponsors',
  standalone: true,
  imports: [AsyncPipe, FormsModule],
  templateUrl: './admin-sponsors.html',
  styleUrls: ['./admin-sponsors.css'],
})
export class AdminSponsors implements OnInit {
  private sponsorService = inject(SponsorService);

  sponsors$!: Observable<Sponsor[]>;

  // Status van het formulier
  toonFormulier = false;
  bewerkId: string | null = null;
  nieuweSponsor: Omit<Sponsor, 'id'> = {
    naam: '',
    websiteUrl: '',
    afbeeldingUrl: '',
  };

  ngOnInit() {
    this.sponsors$ = this.sponsorService.haalAlleSponsorsOp();
  }

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
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.nieuweSponsor.afbeeldingUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  opslaan() {
    if (this.bewerkId !== null) {
      this.sponsorService
        .updateSponsor(this.bewerkId, this.nieuweSponsor)
        .subscribe(() => this.toggleFormulier());
    } else {
      this.sponsorService
        .voegSponsorToe(this.nieuweSponsor)
        .subscribe(() => this.toggleFormulier());
    }
  }

  private resetFormulier() {
    this.bewerkId = null;
    this.nieuweSponsor = { naam: '', websiteUrl: '', afbeeldingUrl: '' };
  }
}
