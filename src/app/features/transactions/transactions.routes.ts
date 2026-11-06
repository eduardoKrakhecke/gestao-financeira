import { Routes } from '@angular/router';

import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

export const TRANSACTIONS_ROUTES: Routes = [
  {
    path: '',
    component: FeaturePlaceholderComponent,
    data: { title: 'Transações' }
  }
];
