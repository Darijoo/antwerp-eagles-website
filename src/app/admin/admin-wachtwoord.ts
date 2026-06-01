import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../diensten/auth.service';

@Component({
  selector: 'app-admin-wachtwoord',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './admin-wachtwoord.html',
  styleUrl: './admin-wachtwoord.scss',
})
export class AdminWachtwoord {
  private authService = inject(AuthService);

  nieuwWachtwoord: string = '';
  bevestigWachtwoord: string = '';
  
  isAanHetOpslaan: boolean = false;
  succesBericht: string = '';
  foutBericht: string = '';

  opslaan() {
    this.succesBericht = '';
    this.foutBericht = '';

    if (!this.nieuwWachtwoord || !this.bevestigWachtwoord) {
      this.foutBericht = 'Vul beide velden in.';
      return;
    }

    if (this.nieuwWachtwoord !== this.bevestigWachtwoord) {
      this.foutBericht = 'Wachtwoorden komen niet overeen.';
      return;
    }

    if (this.nieuwWachtwoord.length < 6) {
      this.foutBericht = 'Wachtwoord moet minstens 6 karakters lang zijn.';
      return;
    }

    this.isAanHetOpslaan = true;

    this.authService.changePassword(this.nieuwWachtwoord).subscribe({
      next: () => {
        this.isAanHetOpslaan = false;
        this.succesBericht = 'Wachtwoord succesvol gewijzigd!';
        this.nieuwWachtwoord = '';
        this.bevestigWachtwoord = '';
      },
      error: (err: any) => {
        this.isAanHetOpslaan = false;
        if (err.code === 'auth/requires-recent-login') {
          this.foutBericht = 'U bent te lang ingelogd. Log opnieuw in en probeer het opnieuw.';
        } else {
          this.foutBericht = 'Er is een fout opgetreden bij het wijzigen van het wachtwoord.';
        }
        console.error('Fout bij wijzigen wachtwoord:', err);
      }
    });
  }
}
