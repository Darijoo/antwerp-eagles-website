import { Injectable, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  setDoc,
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
  prijsIndicatie: number | null;
  winkelNaam?: string; // Oude veld (behoud voor data migratie)
  winkelLink?: string; // Oude veld (behoud voor data migratie)
  winkels?: { naam: string; link: string }[]; // Nieuw: meerdere winkels
  top: number;
  left: number;
  categorie?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UniformService {
  private firestore = inject(Firestore);
  private injector = inject(EnvironmentInjector);
  private uniformCollection = collection(this.firestore, 'uniform');
  private instellingenDoc = doc(this.firestore, 'uniform-instellingen/afbeeldingen');

  private onderdelen$ = collectionData(this.uniformCollection, { idField: 'id' }) as Observable<UniformOnderdeel[]>;

  haalAlleOnderdelenOp(): Observable<UniformOnderdeel[]> {
    return this.onderdelen$;
  }

  haalAfbeeldingenOp(): Observable<Record<string, string>> {
    return docData(this.instellingenDoc) as Observable<Record<string, string>>;
  }

  updateAfbeelding(categorie: string, url: string): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      return from(setDoc(this.instellingenDoc, { [categorie]: url }, { merge: true }));
    });
  }

  voegOnderdeelToe(onderdeel: UniformOnderdeel): Observable<any> {
    return runInInjectionContext(this.injector, () => {
      return from(addDoc(this.uniformCollection, onderdeel));
    });
  }

  updateOnderdeel(id: string, onderdeel: Partial<UniformOnderdeel>): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, `uniform/${id}`);
      return from(updateDoc(docRef, onderdeel as any));
    });
  }

  verwijderOnderdeel(id: string): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, `uniform/${id}`);
      return from(deleteDoc(docRef));
    });
  }
}
