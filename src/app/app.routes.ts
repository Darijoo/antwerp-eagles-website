import { Routes } from '@angular/router';
import { Home } from './home/home'; // (Jouw benaming!)
import { Teams } from './teams/teams';
import { Contact } from './contact/contact';
import { NieuwsArtikel } from './nieuws-artikel/nieuws-artikel'; // <-- 1. Importeer
import { Admin } from './admin/admin';
import { authGuard } from './diensten/auth.guard';
import { Login } from './login';
import { TeamDetail } from './team-detail/team-detail';
import { OverOns } from './over-ons/over-ons';
import { Kalender } from './kalender/kalender';
import { Aansluiten } from './aansluiten/aansluiten';
import { HuishoudelijkReglement } from './huishoudelijk-reglement';
import { Sportreglement } from './sportreglement';
import { UnderConstruction } from './under-construction';
import { Privacybeleid } from '../privacybeleid';
import { PaginaNietGevonden } from './footer/pagina-niet-gevonden';
import { UniformGids } from './uniform-gids/uniform-gids';
import { Evenementen } from './evenementen/evenementen';
import { Nieuws } from './nieuws';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'aansluiten', component: Aansluiten },
  { path: 'huishoudelijk-reglement', component: HuishoudelijkReglement },
  { path: 'sportreglement', component: Sportreglement },
  { path: 'privacybeleid', component: Privacybeleid },
  { path: 'teams', component: Teams },
  { path: 'team/:id', component: TeamDetail }, // <-- Hier hoort de publieke detailpagina
  { path: 'contact', component: Contact },
  { path: 'kalender', component: Kalender },
  { path: 'nieuws/:id', component: NieuwsArtikel }, // <-- 2. Voeg de dynamische route toe
  { path: 'nieuws', component: Nieuws },
  { path: 'historiek', component: OverOns },
  { path: 'uniform', component: UniformGids },
  { path: 'evenementen', component: Evenementen },

  // Tijdelijke 'In Aanbouw' pagina's voor de nieuwe navigatiebalk
  { path: 'klassementen', component: UnderConstruction },
  { path: 'toernooien', component: UnderConstruction },

  { path: 'login', component: Login },

  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then(m => m.Admin),
    canActivate: [authGuard],
    children: [
      {
        path: 'nieuws',
        loadComponent: () => import('./admin/admin-nieuws').then(m => m.AdminNieuws)
      },
      {
        path: 'teams',
        loadComponent: () => import('./admin/admin-teams').then(m => m.AdminTeams)
      },
      {
        path: 'uniform',
        loadComponent: () => import('./admin/admin-uniform').then((m) => m.AdminUniform),
      },
      {
        path: 'sponsors',
        loadComponent: () => import('./admin/admin-sponsors').then(m => m.AdminSponsors)
      },
      {
        path: 'kalender',
        loadComponent: () => import('./admin/admin-kalender/admin-kalender').then(m => m.AdminKalender)
      },
      {
        path: 'wachtwoord',
        loadComponent: () => import('./admin/admin-wachtwoord').then(m => m.AdminWachtwoord)
      }
    ],
  },

  // De "Catch-all" 404 route (MOET altijd helemaal onderaan staan!)
  { path: '**', component: PaginaNietGevonden }
];

