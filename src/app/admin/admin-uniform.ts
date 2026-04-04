import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { UniformService, UniformOnderdeel } from '../diensten/uniform';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  onderdelen$: Observable<UniformOnderdeel[]> = this.uniformService.haalAlleOnderdelenOp();

  isAanHetOpslaan = false;
  toonFormulier = false;
  bewerkId: string | null = null;

  nieuwOnderdeel: UniformOnderdeel = {
    naam: '',
    beschrijving: '',
    verplicht: true,
    prijsIndicatie: '',
    winkelNaam: '',
    winkelLink: '',
    top: 50,
    left: 50,
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
      prijsIndicatie: '',
      winkelNaam: '',
      winkelLink: '',
      top: 50,
      left: 50,
    };
  }
}
