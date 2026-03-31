import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule], // Nodig voor [(ngModel)] in de HTML
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  username = '';
  password = '';
  errorMessage = '';

  authService = inject(AuthService);
  router = inject(Router);

  onSubmit() {
    // Let op: Dit is een hardcoded check voor testdoeleinden!
    if (this.username === 'admin' && this.password === 'eagles123') {
      this.authService.login();
      this.router.navigate(['/admin']); // Stuur door naar admin na succesvol inloggen
    } else {
      this.errorMessage = 'Ongeldige gebruikersnaam of wachtwoord.';
    }
  }
}
