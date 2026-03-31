import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
// 1. Haal withFetch erbij uit de gereedschapskist:
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // 2. Zet de moderne fetch-motor aan!
    provideHttpClient(withFetch()),
  ],
};
