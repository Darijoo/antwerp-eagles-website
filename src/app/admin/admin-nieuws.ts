import { Component, OnInit, inject } from '@angular/core';
import { NieuwsService, NieuwsBericht } from '../diensten/nieuws';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-nieuws',
  standalone: true,
  imports: [AsyncPipe, FormsModule],
  templateUrl: './admin-nieuws.html',
  styleUrls: ['./admin-nieuws.css'],
})
export class AdminNieuws implements OnInit {
  private nieuwsService = inject(NieuwsService);

  // We gebruiken nu een Observable om de data actueel te houden.
  nieuwsberichten$!: Observable<NieuwsBericht[]>;

  // Status van het formulier
  toonFormulier = false;
  bewerkId: string | null = null;
  nieuwBericht: Omit<NieuwsBericht, 'id'> = {
    titel: '',
    datum: new Date().toISOString().split('T')[0], // Standaard vandaag
    samenvatting: '',
    volledigeText: '',
    afbeeldingUrl: '',
  };

  ngOnInit() {
    this.laadNieuws();
  }

  laadNieuws() {
    this.nieuwsberichten$ = this.nieuwsService.haalLaatsteNieuwsOp();
  }

  verwijderBericht(id: string) {
    if (confirm('Weet je zeker dat je dit bericht wilt verwijderen?')) {
      this.nieuwsService.verwijderNieuwsBericht(id).subscribe(() => {
        this.laadNieuws(); // Tabel verversen vanaf de backend
      });
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
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.nieuwBericht.afbeeldingUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  opslaan() {
    if (this.bewerkId !== null) {
      this.nieuwsService.updateNieuwsBericht(this.bewerkId, this.nieuwBericht).subscribe(() => {
        this.toggleFormulier(); // Sluit formulier en maak het leeg na succes
        this.laadNieuws();
      });
    } else {
      this.nieuwsService.voegNieuwsBerichtToe(this.nieuwBericht).subscribe(() => {
        this.toggleFormulier(); // Sluit formulier en maak het leeg na succes
        this.laadNieuws();
      });
    }
  }

  private resetFormulier() {
    this.bewerkId = null;
    this.nieuwBericht = {
      titel: '',
      datum: new Date().toISOString().split('T')[0],
      samenvatting: '',
      volledigeText: '',
      afbeeldingUrl: '',
    };
  }
}
