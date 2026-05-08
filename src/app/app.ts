import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './navbar/navbar';
import { Footer } from './footer/footer';
import { CookieBanner } from './cookie-banner';
import { AutoSyncService } from './diensten/auto-sync.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, CookieBanner],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('antwerp-eagles-website');
  
  constructor(private autoSyncService: AutoSyncService) {
    // Probeer bij het laden van de applicatie de kalender in de achtergrond te syncen
    // (doet enkel iets als het langer dan 12u geleden is)
    this.autoSyncService.probeerAutomatischeSync();
  }
}
