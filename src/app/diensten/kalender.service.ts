import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Match {
  id?: string;
  type?: 'wedstrijd' | 'evenement' | 'training';
  team?: string;
  titel?: string;
  omschrijving?: string;
  datum: any; // Firestore timestamp
  thuisploeg?: string;
  uitploeg?: string;
  tijd: string;
  locatie: string;
  uitslag?: string; // Optioneel
  isHandmatigBewerkt?: boolean;
  posterUrl?: string; // Voor evenementen
  inschrijfLink?: string; // Voor evenementen
}

@Injectable({
  providedIn: 'root',
})
export class KalenderService {
  private firestore: Firestore = inject(Firestore);
  private matchesCollection = collection(this.firestore, 'wedstrijden');
  private matchenQuery = query(this.matchesCollection, orderBy('datum', 'asc'));

  // De observable één keer aanmaken tijdens de opstart (wanneer de Injection Context nog actief is)
  private wedstrijden$ = collectionData(this.matchenQuery, { idField: 'id' }) as Observable<Match[]>;

  // Haal alle wedstrijden op, gesorteerd op datum
  haalAlleWedstrijdenOp(): Observable<Match[]> {
    return this.wedstrijden$;
  }

  // Voeg een nieuwe wedstrijd toe
  voegWedstrijdToe(wedstrijd: Omit<Match, 'id'>) {
    return addDoc(this.matchesCollection, wedstrijd);
  }

  // Verwijder een wedstrijd
  verwijderWedstrijd(id: string) {
    if (!id) {
      return Promise.reject(new Error('Kan wedstrijd niet verwijderen: Geen geldig ID'));
    }
    const docRef = doc(this.firestore, `wedstrijden/${id}`);
    return deleteDoc(docRef);
  }

  // Update een bestaande wedstrijd (bijv. om een uitslag toe te voegen)
  updateWedstrijd(id: string, data: Partial<Match>) {
    if (!id) {
      return Promise.reject(new Error('Kan wedstrijd niet updaten: Geen geldig ID'));
    }
    const docRef = doc(this.firestore, `wedstrijden/${id}`);
    return updateDoc(docRef, data);
  }
}
