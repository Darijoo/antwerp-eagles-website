import { Component, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  menuOpen = false;
  isScrolled = false;
  lastScrollY = 0;
  activeDropdown: string | null = null;

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    if (!this.menuOpen) this.activeDropdown = null;
  }

  sluitMenu() {
    this.menuOpen = false;
    this.activeDropdown = null;
    // Zorgt ervoor dat je bij het navigeren naar een andere pagina altijd weer netjes bovenaan begint
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  toggleDropdown(menu: string, event: Event) {
    event.preventDefault(); // Voorkom dat de pagina naar boven springt bij een '#' link
    this.activeDropdown = this.activeDropdown === menu ? null : menu;
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const currentScrollY = window.scrollY;
    
    this.isScrolled = currentScrollY > 50; // Activeer shrink-modus na 50px

    // Sluit het mobiele menu automatisch als de gebruiker begint te scrollen
    if (this.menuOpen && Math.abs(currentScrollY - this.lastScrollY) > 20) {
      this.sluitMenu();
    }
    
    this.lastScrollY = currentScrollY;
  }
}
