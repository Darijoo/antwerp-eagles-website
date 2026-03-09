import { Routes } from '@angular/router';
import { Home } from './home/home'; // (Jouw benaming!)
import { Teams } from './teams/teams';
import { Contact } from './contact/contact';
import { NieuwsArtikel } from './nieuws-artikel/nieuws-artikel'; // <-- 1. Importeer

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'teams', component: Teams },
  { path: 'contact', component: Contact },
  { path: 'nieuws/:id', component: NieuwsArtikel }, // <-- 2. Voeg de dynamische route toe
];
