import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';

// Simpele interface voor een team, zonder Strapi-specifieke velden.
export interface Team {
  id: string; // Firebase IDs zijn unieke tekstreeksen (strings)
  naam: string;
  categorie: string;
  omschrijving: string;
  afbeeldingUrl?: string;
  coach?: string;
  trainingsdagen?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private firestore = inject(Firestore);
  private teamsCollection = collection(this.firestore, 'teams');

  haalAlleTeamsOp(): Observable<Team[]> {
    return collectionData(this.teamsCollection, { idField: 'id' }) as Observable<Team[]>;
  }

  haalTeamOp(id: string): Observable<Team> {
    const teamDoc = doc(this.firestore, `teams/${id}`);
    return docData(teamDoc, { idField: 'id' }) as Observable<Team>;
  }

  voegTeamToe(nieuwTeam: Omit<Team, 'id'>): Observable<any> {
    return from(addDoc(this.teamsCollection, nieuwTeam));
  }

  updateTeam(id: string, gewijzigdTeam: Omit<Team, 'id'>): Observable<void> {
    const teamDoc = doc(this.firestore, `teams/${id}`);
    return from(updateDoc(teamDoc, gewijzigdTeam as any));
  }

  verwijderTeam(id: string): Observable<void> {
    const teamDoc = doc(this.firestore, `teams/${id}`);
    return from(deleteDoc(teamDoc));
  }
}
