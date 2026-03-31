import { Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

// Simpele interface voor een team, zonder Strapi-specifieke velden.
export interface Team {
  id: number;
  naam: string;
  categorie: string;
  omschrijving: string;
  afbeeldingUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  // Hardcoded lijst als vervanging voor de Strapi backend
  private teams = signal<Team[]>([
    {
      id: 1,
      naam: 'Heren 1',
      categorie: 'Senioren',
      omschrijving:
        'Ons eerste herenteam speelt in de hoogste klasse van de competitie en staat bekend om hun sterke verdediging.',
      afbeeldingUrl: 'https://images.unsplash.com/photo-1508344928928-7105b67de451?q=80&w=2000',
    },
    {
      id: 2,
      naam: 'Dames 1',
      categorie: 'Senioren',
      omschrijving:
        'Het damesteam is de absolute trots van onze club, met meerdere kampioenschappen op hun naam.',
      afbeeldingUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=2000',
    },
    {
      id: 3,
      naam: 'U15',
      categorie: 'Jeugd',
      omschrijving:
        'Onze talentvolle jeugd onder de 15 jaar. Plezier en ontwikkeling staan hier voorop!',
      afbeeldingUrl: 'https://images.unsplash.com/photo-1629114631087-85354b35a10a?q=80&w=2000',
    },
  ]);

  haalAlleTeamsOp(): Observable<Team[]> {
    return of(this.teams());
  }

  haalTeamOp(id: number): Observable<Team> {
    const team = this.teams().find((t) => t.id === id);
    if (team) {
      return of(team);
    }
    return throwError(() => new Error(`Team met id ${id} niet gevonden`));
  }

  voegTeamToe(nieuwTeam: Omit<Team, 'id'>): Observable<Team> {
    // Zoek het hoogste ID en tel er 1 bij op
    const id = Math.max(0, ...this.teams().map((t) => t.id)) + 1;
    const teamMetId: Team = { ...nieuwTeam, id };
    this.teams.update((teams) => [...teams, teamMetId]);
    return of(teamMetId);
  }

  updateTeam(id: number, gewijzigdTeam: Omit<Team, 'id'>): Observable<Team> {
    const compleetTeam: Team = { ...gewijzigdTeam, id };
    this.teams.update((teams) => teams.map((t) => (t.id === id ? compleetTeam : t)));
    return of(compleetTeam);
  }

  verwijderTeam(id: number): Observable<{}> {
    this.teams.update((teams) => teams.filter((t) => t.id !== id));
    return of({});
  }
}
