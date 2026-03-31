import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // We gebruiken een Angular Signal om de inlogstatus bij te houden.
  // Standaard staat dit op 'false' (niet ingelogd).
  isLoggedIn = signal<boolean>(false);

  login() {
    this.isLoggedIn.set(true);
  }

  logout() {
    this.isLoggedIn.set(false);
  }
}
