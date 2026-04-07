import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';

export interface UniformOnderdeel {
  id?: string;
  naam: string;
  beschrijving: string;
  verplicht: boolean;
  prijsIndicatie: string;
  winkelNaam: string;
  winkelLink: string;
  top: number;
  left: number;
  categorie?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UniformService {
  private firestore = inject(Firestore);
  private uniformCollection = collection(this.firestore, 'uniform');

  haalAlleOnderdelenOp(): Observable<UniformOnderdeel[]> {
    return collectionData(this.uniformCollection, { idField: 'id' }) as Observable<
      UniformOnderdeel[]
    >;
  }

  voegOnderdeelToe(onderdeel: UniformOnderdeel): Observable<any> {
    return from(addDoc(this.uniformCollection, onderdeel));
  }

  updateOnderdeel(id: string, onderdeel: Partial<UniformOnderdeel>): Observable<void> {
    const docRef = doc(this.firestore, `uniform/${id}`);
    return from(updateDoc(docRef, onderdeel as any));
  }

  verwijderOnderdeel(id: string): Observable<void> {
    const docRef = doc(this.firestore, `uniform/${id}`);
    return from(deleteDoc(docRef));
  }
}
