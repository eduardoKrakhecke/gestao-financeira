import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(
        module => module.DASHBOARD_ROUTES
      )
  },
  {
    path: '**',
    redirectTo: ''
  }
];
