import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './diensten/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule], // Nodig voor [(ngModel)] in de HTML
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  email = '';
  password = '';
  errorMessage = '';

  authService = inject(AuthService);
  router = inject(Router);

  onSubmit() {
    // Firebase Authentication verwacht een e-mailadres.
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.router.navigate(['/admin']); // Stuur door naar admin na succesvol inloggen
      },
      error: (err) => {
        console.error('Inlogfout:', err);
        this.errorMessage = 'Inloggen mislukt. Controleer je e-mail en wachtwoord.';
      },
    });
  }
}
