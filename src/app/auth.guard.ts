import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true; // De gebruiker is ingelogd, laat ze door!
  } else {
    // Niet ingelogd? Stuur de gebruiker naar de inlogpagina
    return router.parseUrl('/login');
  }
};
