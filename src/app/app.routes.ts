import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Teams } from './teams/teams';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'teams', // Let op: zonder de schuine streep (/) ervoor
    component: Teams,
  },
];
