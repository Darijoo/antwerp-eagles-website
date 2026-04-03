import { Routes } from '@angular/router';
import { Home } from './home/home'; // (Jouw benaming!)
import { Teams } from './teams/teams';
import { Contact } from './contact/contact';
import { NieuwsArtikel } from './nieuws-artikel/nieuws-artikel'; // <-- 1. Importeer
import { Admin } from './admin/admin';
import { authGuard } from './diensten/auth.guard';
import { Login } from './login';
import { AdminNieuws } from './admin/admin-nieuws';
import { AdminTeams } from './admin/admin-teams';
import { AdminSponsors } from './admin/admin-sponsors';
import { TeamDetail } from './team-detail/team-detail';
import { OverOns } from './over-ons/over-ons';
import { AdminKalender } from './admin/admin-kalender/admin-kalender';
import { Kalender } from './kalender/kalender';
import { Aansluiten } from './aansluiten/aansluiten';
import { HuishoudelijkReglement } from './huishoudelijk-reglement';
import { Sportreglement } from './sportreglement';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'aansluiten', component: Aansluiten },
  { path: 'huishoudelijk-reglement', component: HuishoudelijkReglement },
  { path: 'sportreglement', component: Sportreglement },
  { path: 'over-ons', component: OverOns },
  { path: 'teams', component: Teams },
  { path: 'team/:id', component: TeamDetail }, // <-- Hier hoort de publieke detailpagina
  { path: 'contact', component: Contact },
  { path: 'kalender', component: Kalender },
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
      { path: 'kalender', component: AdminKalender },
    ],
  },
];
