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
  type?: 'wedstrijd' | 'evenement';
  team?: string;
  titel?: string;
  omschrijving?: string;
  datum: any; // Firestore timestamp
  thuisploeg?: string;
  uitploeg?: string;
  tijd: string;
  locatie: string;
  uitslag?: string; // Optioneel
}

@Injectable({
  providedIn: 'root',
})
export class KalenderService {
  private firestore: Firestore = inject(Firestore);
  private matchesCollection = collection(this.firestore, 'wedstrijden');

  // Haal alle wedstrijden op, gesorteerd op datum
  haalAlleWedstrijdenOp(): Observable<Match[]> {
    const q = query(this.matchesCollection, orderBy('datum', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Match[]>;
  }

  // Voeg een nieuwe wedstrijd toe
  voegWedstrijdToe(wedstrijd: Omit<Match, 'id'>) {
    return addDoc(this.matchesCollection, wedstrijd);
  }

  // Verwijder een wedstrijd
  verwijderWedstrijd(id: string) {
    const docRef = doc(this.firestore, `wedstrijden/${id}`);
    return deleteDoc(docRef);
  }

  // Update een bestaande wedstrijd (bijv. om een uitslag toe te voegen)
  updateWedstrijd(id: string, data: Partial<Match>) {
    const docRef = doc(this.firestore, `wedstrijden/${id}`);
    return updateDoc(docRef, data);
  }
}
