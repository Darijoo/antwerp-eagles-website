import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../diensten/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-container">
      <nav class="admin-nav">
        <h3>Beheer</h3>
        <a routerLink="nieuws" routerLinkActive="active">Nieuws</a>
        <a routerLink="teams" routerLinkActive="active">Teams</a>
        <a routerLink="sponsors" routerLinkActive="active">Sponsors</a>
        <button (click)="logout()" class="logout-button">Uitloggen</button>
      </nav>
      <main class="admin-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styleUrls: ['./admin.css'],
})
export class Admin {
  private authService = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
