import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAKa91f2DbvWU5RCjUgUh6t1wF290bumu8',
  authDomain: 'antwerp-eagles-d0a87.firebaseapp.com',
  projectId: 'antwerp-eagles-d0a87',
  storageBucket: 'antwerp-eagles-d0a87.firebasestorage.app',
  messagingSenderId: '53557639212',
  appId: '1:53557639212:web:0fa9393a81868fbd437989',
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
  ],
};
