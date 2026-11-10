import { Routes } from '@angular/router';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { LoginComponent } from './core/auth/pages/login/login/login.component';
import { RegisterComponent } from './core/auth/pages/register/register.component';

export const routes: Routes = [

  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [guestGuard]
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes')
            .then(m => m.DASHBOARD_ROUTES)
      },
      {
        path: 'transactions',
        loadChildren: () =>
          import('./features/transactions/transactions.routes')
            .then(m => m.TRANSACTIONS_ROUTES)
      },
      {
        path: 'accounts',
        loadChildren: () =>
          import('./features/accounts/accounts.routes')
            .then(m => m.ACCOUNTS_ROUTES)
      },
      {
        path: 'categories',
        loadChildren: () =>
          import('./features/categories/categories.routes')
            .then(m => m.CATEGORIES_ROUTES)
      },
      {
        path: 'budgets',
        loadChildren: () =>
          import('./features/budgets/budgets.routes')
            .then(m => m.BUDGETS_ROUTES)
      },
      {
        path: 'pages',
        loadChildren: () =>
          import('./features/goals/goals.routes')
            .then(m => m.GOALS_ROUTES)
      },
      {
        path: 'transfers',
        loadChildren: () =>
          import('./features/transfers/transfers.routes')
            .then(m => m.TRANSFERS_ROUTES)
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.routes')
            .then(m => m.REPORTS_ROUTES)
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes')
            .then(m => m.SETTINGS_ROUTES)
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
