import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-under-construction',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div style="padding: 8rem 2rem; text-align: center; min-height: calc(100vh - 200px); background-color: var(--bg-light);">
      <i class="fa-solid fa-person-digging fa-4x" style="color: var(--eagle-red); margin-bottom: 1.5rem;"></i>
      <h1 style="color: var(--eagle-blue); font-size: 2.5rem; text-transform: uppercase; margin-bottom: 1rem;">In Aanbouw</h1>
      <p style="font-size: 1.2rem; color: var(--text-dark); max-width: 600px; margin: 0 auto; line-height: 1.6;">
        We werken achter de schermen hard aan de nieuwe website! Deze pagina is binnenkort beschikbaar. <br><br>
        <a routerLink="/" style="color: var(--eagle-red); font-weight: bold; text-decoration: none;">&larr; Terug naar Homeplate</a>
      </p>
    </div>
  `
})
export class UnderConstruction {}