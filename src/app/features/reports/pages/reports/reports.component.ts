
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

import { ReportsService } from '../../services/reports.service';
import { ReportsData } from '../../models/report.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly reportsService = inject(ReportsService);
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('monthlyChart') monthlyChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChart?: ElementRef<HTMLCanvasElement>;

  readonly report = signal<ReportsData | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly startDate = signal(this.getFirstDayOfMonth());
  readonly endDate = signal(this.getToday());

  private viewInitialized = false;
  private charts: Array<{ destroy: () => void }> = [];

  ngOnInit(): void {
    this.loadReports();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  loadReports(): void {
    if (!this.startDate() || !this.endDate()) {
      this.error.set('Informe as datas do período.');
      return;
    }

    if (this.startDate() > this.endDate()) {
      this.error.set('A data inicial não pode ser posterior à data final.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.reportsService
      .getReportData(this.startDate(), this.endDate())
      .subscribe({
        next: data => {
          this.report.set(data);
          this.loading.set(false);
          this.renderCharts();
        },
        error: () => {
          this.error.set('Não foi possível carregar os relatórios.');
          this.loading.set(false);
        }
      });
  }

  onStartDateChange(value: string): void {
    this.startDate.set(value);
  }

  onEndDateChange(value: string): void {
    this.endDate.set(value);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  }

  formatMonth(value: string): string {
    const [year, month] = value.split('-').map(Number);

    return new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      year: '2-digit'
    }).format(new Date(year, month - 1, 12));
  }

  exportCSV(): void {
    const data = this.report();

    if (!data || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const rows: string[][] = [
      ['Tipo', 'Descrição', 'Categoria', 'Data', 'Status', 'Valor']
    ];

    data.transactions.forEach(transaction => {
      const category = transaction.categoryId;

      rows.push([
        transaction.type === 'income' ? 'Receita' : 'Despesa',
        transaction.description,
        category,
        transaction.paymentDate || transaction.dueDate,
        transaction.status,
        (transaction.amount / 100).toFixed(2).replace('.', ',')
      ]);
    });

    const csv = rows
      .map(row =>
        row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `financeflow-relatorio-${this.startDate()}-${this.endDate()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  printReport(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }

  private renderCharts(): void {
    if (
      !isPlatformBrowser(this.platformId) ||
      !this.viewInitialized ||
      !this.report()
    ) {
      return;
    }

    const data = this.report();

    if (!data) {
      return;
    }

    this.destroyCharts();

    import('chart.js/auto').then(({ default: Chart }) => {
      if (!this.report() || !this.monthlyChart || !this.categoryChart) {
        return;
      }

      const monthlyContext = this.monthlyChart.nativeElement;
      const categoryContext = this.categoryChart.nativeElement;

      const monthly = new Chart(monthlyContext, {
        type: 'bar',
        data: {
          labels: data.monthlyEvolution.map(item =>
            this.formatMonth(item.month)
          ),
          datasets: [
            {
              label: 'Receitas',
              data: data.monthlyEvolution.map(item => item.income / 100),
              backgroundColor: '#16a34a',
              borderRadius: 6
            },
            {
              label: 'Despesas',
              data: data.monthlyEvolution.map(item => item.expenses / 100),
              backgroundColor: '#ef4444',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: context =>
                  `${context.dataset.label}: ${this.formatCurrency(
                    Number(context.raw) * 100
                  )}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: value =>
                  new Intl.NumberFormat('pt-BR', {
                    notation: 'compact',
                    style: 'currency',
                    currency: 'BRL'
                  }).format(Number(value))
              }
            }
          }
        }
      });

      const category = new Chart(categoryContext, {
        type: 'doughnut',
        data: {
          labels: data.expensesByCategory.map(item => item.categoryName),
          datasets: [
            {
              data: data.expensesByCategory.map(item => item.total / 100),
              backgroundColor: data.expensesByCategory.map(item => item.color),
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: context =>
                  `${context.label}: ${this.formatCurrency(
                    Number(context.raw) * 100
                  )}`
              }
            }
          }
        }
      });

      this.charts = [monthly, category];
    });
  }

  private destroyCharts(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];
  }

  private getToday(): string {
    const date = new Date();

    return this.toDateInputValue(date);
  }

  private getFirstDayOfMonth(): string {
    const date = new Date();
    date.setDate(1);

    return this.toDateInputValue(date);
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
