
import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/settings/settings.component').then(
        module => module.SettingsComponent
      )
  }
];
