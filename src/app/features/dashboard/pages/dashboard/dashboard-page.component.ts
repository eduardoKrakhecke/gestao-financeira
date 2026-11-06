import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { DashboardService } from '../../services/dashboard.service';
import { DashboardSummary } from '../../models/dashboard.model';
import { DashboardPeriod } from '../../models/dashboard.model';
import { DashboardChartsComponent } from '../../components/dashboard-charts/dashboard-charts.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, DashboardChartsComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent {

  private readonly dashboardService = inject(DashboardService);

  readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly period = signal<DashboardPeriod>('current-month');
  readonly hasData = computed(() => this.summary() !== null);

  readonly dashboardData = computed(() => this.summary());

  readonly Math = Math;

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(
    period: DashboardPeriod = this.period()
  ): void {
    this.period.set(period);
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getDashboardData(period).subscribe({
      next: data => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: err => {
        console.error('Erro ao carregar o Dashboard:', err);

        this.error.set(
          'Não foi possível carregar os dados financeiros. Verifique sua conexão e tente novamente.'
        );

        this.loading.set(false);
      }
    });
  }

  changePeriod(period: DashboardPeriod): void {
    this.loadDashboard(period);
  }

  formatCurrency(amountInCents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amountInCents / 100);
  }

  getBudgetPercentage(categoryId: string): number {
    const data = this.summary();

    if (!data) return 0;

    const budget = data.budgets.find(
      item => item.categoryId === categoryId
    );

    const category = data.categories.find(
      item => item.categoryId === categoryId
    );

    if (!budget || budget.limit <= 0 || !category) return 0;

    return Math.min((category.total / budget.limit) * 100, 100);
  }





}
