import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'; // <-- 1. Importeer RouterLink

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink], // <-- 2. Voeg hem toe aan de imports!
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  menuOpen = false;
  activeDropdown: string | null = null;

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    if (!this.menuOpen) this.activeDropdown = null;
  }

  sluitMenu() {
    this.menuOpen = false;
    this.activeDropdown = null;
  }

  toggleDropdown(menu: string, event: Event) {
    event.preventDefault(); // Voorkom dat de pagina naar boven springt bij een '#' link
    this.activeDropdown = this.activeDropdown === menu ? null : menu;
  }
}
