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

// Simpele interface voor een nieuwsbericht, zonder Strapi-specifieke velden.
export interface NieuwsBericht {
  id: string; // Firebase IDs zijn unieke tekstreeksen (strings)
  titel: string;
  datum: string;
  samenvatting: string;
  volledigeText: string;
  afbeeldingUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NieuwsService {
  private firestore = inject(Firestore);
  private nieuwsCollection = collection(this.firestore, 'nieuws'); // Verwijst naar de map 'nieuws' in je database

  haalLaatsteNieuwsOp(): Observable<NieuwsBericht[]> {
    // collectionData leest alles direct uit Firestore en houdt het live up-to-date!
    return collectionData(this.nieuwsCollection, { idField: 'id' }) as Observable<NieuwsBericht[]>;
  }

  haalNieuwsBerichtOp(id: string): Observable<NieuwsBericht> {
    const berichtDoc = doc(this.firestore, `nieuws/${id}`);
    return docData(berichtDoc, { idField: 'id' }) as Observable<NieuwsBericht>;
  }

  voegNieuwsBerichtToe(nieuwBericht: Omit<NieuwsBericht, 'id'>): Observable<any> {
    // from() zorgt ervoor dat we netjes een Observable teruggeven, zodat .subscribe() blijft werken
    return from(addDoc(this.nieuwsCollection, nieuwBericht));
  }

  updateNieuwsBericht(id: string, gewijzigdBericht: Omit<NieuwsBericht, 'id'>): Observable<void> {
    const berichtDoc = doc(this.firestore, `nieuws/${id}`);
    return from(updateDoc(berichtDoc, gewijzigdBericht as any));
  }

  verwijderNieuwsBericht(id: string): Observable<void> {
    const berichtDoc = doc(this.firestore, `nieuws/${id}`);
    return from(deleteDoc(berichtDoc));
  }
}
