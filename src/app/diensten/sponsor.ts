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

export interface Sponsor {
  id: string; // Firebase IDs zijn unieke tekstreeksen
  naam: string;
  websiteUrl?: string;
  afbeeldingUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SponsorService {
  private firestore = inject(Firestore);
  private sponsorsCollection = collection(this.firestore, 'sponsors');

  haalAlleSponsorsOp(): Observable<Sponsor[]> {
    return collectionData(this.sponsorsCollection, { idField: 'id' }) as Observable<Sponsor[]>;
  }

  haalSponsorOp(id: string): Observable<Sponsor> {
    const sponsorDoc = doc(this.firestore, `sponsors/${id}`);
    return docData(sponsorDoc, { idField: 'id' }) as Observable<Sponsor>;
  }

  voegSponsorToe(nieuweSponsor: Omit<Sponsor, 'id'>): Observable<any> {
    return from(addDoc(this.sponsorsCollection, nieuweSponsor));
  }

  updateSponsor(id: string, gewijzigdSponsor: Omit<Sponsor, 'id'>): Observable<void> {
    const sponsorDoc = doc(this.firestore, `sponsors/${id}`);
    return from(updateDoc(sponsorDoc, gewijzigdSponsor as any));
  }

  verwijderSponsor(id: string): Observable<void> {
    const sponsorDoc = doc(this.firestore, `sponsors/${id}`);
    return from(deleteDoc(sponsorDoc));
  }
}
