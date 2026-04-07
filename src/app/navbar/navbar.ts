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
  isHidden = false;
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
    
    if (currentScrollY <= 0) {
      this.isHidden = false; // Altijd tonen als we helemaal bovenaan zijn (voorkomt mobiele scroll-bugs)
    } else if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
      // Verberg de navbar bij naar beneden scrollen
      this.isHidden = true;
      if (this.menuOpen) this.sluitMenu(); // Zorg dat we opengeklapte mobiele menu's meteen netjes meesluiten!
    } else if (currentScrollY < this.lastScrollY) {
      this.isHidden = false; // Toon de navbar weer zodra je naar boven scrolt
    }
    this.lastScrollY = currentScrollY;
  }
}
