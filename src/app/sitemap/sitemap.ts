import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sitemap',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="sitemap-container container">
      <h2 class="sectie-titel">Sitemap</h2>
      <div class="sitemap-grid">
        <div class="sitemap-sectie">
          <h3>Algemeen</h3>
          <ul>
            <li><a routerLink="/">Homeplate</a></li>
            <li><a routerLink="/nieuws">Nieuws</a></li>
            <li><a routerLink="/kalender">Kalender & Uitslagen</a></li>
            <li><a routerLink="/contact">Contact</a></li>
          </ul>
        </div>
        <div class="sitemap-sectie">
          <h3>Club Info</h3>
          <ul>
            <li><a routerLink="/historiek">Historiek & Over Ons</a></li>
            <li><a routerLink="/teams">Onze Teams</a></li>
            <li><a routerLink="/aansluiten">Lid Worden / Tarieven</a></li>
            <li><a routerLink="/uniform">Uniform & Uitrusting</a></li>
            <li><a routerLink="/huishoudelijk-reglement">Huishoudelijk Reglement</a></li>
            <li><a routerLink="/sportreglement">Sportreglement</a></li>
            <li><a routerLink="/privacybeleid">Privacybeleid (GDPR)</a></li>
          </ul>
        </div>
        <div class="sitemap-sectie">
          <h3>Nog meer</h3>
          <ul>
            <li><a routerLink="/klassementen">Klassementen</a></li>
            <li><a routerLink="/evenementen">Evenementen</a></li>
            <li><a routerLink="/toernooien">Eagles Toernooien</a></li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sitemap-container {
      padding: 4rem 1rem;
      min-height: 60vh;
    }
    .sitemap-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 3rem;
      margin-top: 2rem;
    }
    .sitemap-sectie h3 {
      color: var(--eagle-blue);
      border-bottom: 2px solid var(--eagle-red);
      padding-bottom: 0.5rem;
      margin-bottom: 1rem;
    }
    ul {
      list-style: none;
      padding: 0;
    }
    li {
      margin-bottom: 0.8rem;
    }
    a {
      color: var(--text-dark);
      text-decoration: none;
      transition: color 0.3s ease;
      &:hover {
        color: var(--eagle-red);
      }
    }
  `]
})
export class Sitemap {}
