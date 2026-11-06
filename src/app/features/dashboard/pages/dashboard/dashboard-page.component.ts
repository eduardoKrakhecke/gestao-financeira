import { Component } from '@angular/core';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';

interface DashboardStat {
  label: string;
  value: string;
  description: string;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [PageHeaderComponent, StatCardComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent {
  readonly stats: DashboardStat[] = [
    {
      label: 'Saldo atual',
      value: 'R$ 0,00',
      description: 'Nenhuma movimentação registrada'
    },
    {
      label: 'Receitas',
      value: 'R$ 0,00',
      description: 'Entradas no período atual'
    },
    {
      label: 'Despesas',
      value: 'R$ 0,00',
      description: 'Saídas no período atual'
    }
  ];
}
