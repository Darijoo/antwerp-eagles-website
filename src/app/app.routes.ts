import { Routes } from '@angular/router';
import { Home } from './home/home';

export const routes: Routes = [
  {
    path: '', // Een leeg pad betekent de standaard homepagina (jouwwebsite.be/)
    component: Home,
  },
];
