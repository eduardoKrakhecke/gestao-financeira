
import { Routes } from '@angular/router';

export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/categories/categories.component').then(
        module => module.CategoriesComponent
      )
  }
];
