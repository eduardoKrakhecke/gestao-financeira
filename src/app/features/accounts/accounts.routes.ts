import { Routes } from '@angular/router';

export const ACCOUNTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/accounts/accounts.component')
        .then(m => m.AccountsComponent)
  }
];
