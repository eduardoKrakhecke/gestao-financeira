import { Routes } from '@angular/router';

export const GOALS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/goals/goals.component')
        .then(m => m.GoalsComponent)
  }
];
