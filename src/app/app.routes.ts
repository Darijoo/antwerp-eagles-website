import { Routes } from '@angular/router';
import { Home } from './home/home'; // (Jouw benaming!)
import { Teams } from './teams/teams';
import { Contact } from './contact/contact';
import { NieuwsArtikel } from './nieuws-artikel/nieuws-artikel'; // <-- 1. Importeer
import { Admin } from './admin/admin';
import { authGuard } from './auth.guard';
import { Login } from './login';
import { AdminNieuws } from './admin/admin-nieuws';
import { AdminTeams } from './admin/admin-teams';
import { AdminSponsors } from './admin/admin-sponsors';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'teams', component: Teams },
  { path: 'contact', component: Contact },
  { path: 'nieuws/:id', component: NieuwsArtikel }, // <-- 2. Voeg de dynamische route toe
  { path: 'login', component: Login },
  {
    path: 'admin',
    component: Admin,
    canActivate: [authGuard],
    children: [
      { path: 'nieuws', component: AdminNieuws }, // De nieuwe route voor nieuwsbeheer
      { path: 'teams', component: AdminTeams }, // De nieuwe route voor teambeheer
      { path: 'sponsors', component: AdminSponsors }, // De nieuwe route voor sponsorbeheer
    ],
  },
];
