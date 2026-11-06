import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID, SimpleChanges,
  ViewChild
} from '@angular/core';

import type { Chart as ChartInstance } from 'chart.js';
import type { DashboardSummary } from '../../models/dashboard.model';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-dashboard-charts',
  imports: [],
  standalone: true,
  templateUrl: './dashboard-charts.component.html',
  styleUrl: './dashboard-charts.component.scss'
})
export class DashboardChartsComponent implements AfterViewInit, OnChanges, OnDestroy  {

  @Input({ required: true }) summary!: DashboardSummary;

  @ViewChild('monthlyChart')
  monthlyCanvas!: ElementRef<HTMLCanvasElement>;

  @ViewChild('categoryChart')
  categoryCanvas!: ElementRef<HTMLCanvasElement>;

  @ViewChild('accountChart')
  accountCanvas!: ElementRef<HTMLCanvasElement>;

  private readonly platformId = inject(PLATFORM_ID);

  private monthlyChart?: ChartInstance;
  private categoryChart?: ChartInstance;
  private accountChart?: ChartInstance;

  private viewReady = false;
  private chartModule?: typeof import('chart.js/auto');

  ngAfterViewInit(): void {
    this.viewReady = true;
    void this.initializeCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['summary'] && this.viewReady) {
      this.updateCharts();
    }
  }

  ngOnDestroy(): void {
    this.monthlyChart?.destroy();
    this.categoryChart?.destroy();
    this.accountChart?.destroy();
  }

  private async initializeCharts(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      this.chartModule = await import('chart.js/auto');

      this.createMonthlyChart();
      this.createCategoryChart();
      this.createAccountChart();
    } catch (error) {
      console.error('Não foi possível inicializar os gráficos:', error);
    }
  }

  private createMonthlyChart(): void {
    if (!this.chartModule || !this.monthlyCanvas) return;

    const Chart = this.chartModule.default;
    const textColor = this.getCssVariable('--text-secondary');
    const gridColor = this.getCssVariable('--border');

    this.monthlyChart = new Chart(this.monthlyCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.summary.monthlyEvolution.map(item => item.month),
        datasets: [
          {
            label: 'Receitas',
            data: this.summary.monthlyEvolution.map(item => item.income / 100),
            backgroundColor: '#16a34a',
            borderRadius: 6
          },
          {
            label: 'Despesas',
            data: this.summary.monthlyEvolution.map(item => item.expenses / 100),
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
            labels: { color: textColor }
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
          x: {
            ticks: { color: textColor },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: textColor,
              callback: value => this.formatCompactCurrency(Number(value))
            },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  private createCategoryChart(): void {
    if (!this.chartModule || !this.categoryCanvas) return;

    const Chart = this.chartModule.default;

    this.categoryChart = new Chart(this.categoryCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.summary.categories.map(item => item.name),
        datasets: [{
          data: this.summary.categories.map(item => item.total / 100),
          backgroundColor: this.summary.categories.map(item => item.color),
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: this.getCssVariable('--text-secondary'),
              padding: 18
            }
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
  }

  private createAccountChart(): void {
    if (!this.chartModule || !this.accountCanvas) return;

    const Chart = this.chartModule.default;

    this.accountChart = new Chart(this.accountCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.summary.accounts.map(item => item.name),
        datasets: [{
          label: 'Saldo',
          data: this.summary.accounts.map(item => item.balance / 100),
          backgroundColor: this.summary.accounts.map(item => item.color),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context =>
                this.formatCurrency(Number(context.raw) * 100)
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: this.getCssVariable('--text-secondary'),
              callback: value => this.formatCompactCurrency(Number(value))
            },
            grid: {
              color: this.getCssVariable('--border')
            }
          },
          y: {
            ticks: {
              color: this.getCssVariable('--text-secondary')
            },
            grid: { display: false }
          }
        }
      }
    });
  }


  private updateCharts(): void {
    if (!this.monthlyChart || !this.categoryChart || !this.accountChart) {
      return;
    }

    this.monthlyChart.data.labels =
      this.summary.monthlyEvolution.map(item => item.month);

    this.monthlyChart.data.datasets[0].data =
      this.summary.monthlyEvolution.map(item => item.income / 100);

    this.monthlyChart.data.datasets[1].data =
      this.summary.monthlyEvolution.map(item => item.expenses / 100);

    this.categoryChart.data.labels =
      this.summary.categories.map(item => item.name);

    this.categoryChart.data.datasets[0].data =
      this.summary.categories.map(item => item.total / 100);

    this.categoryChart.data.datasets[0].backgroundColor =
      this.summary.categories.map(item => item.color);

    this.accountChart.data.labels =
      this.summary.accounts.map(item => item.name);

    this.accountChart.data.datasets[0].data =
      this.summary.accounts.map(item => item.balance / 100);

    this.accountChart.data.datasets[0].backgroundColor =
      this.summary.accounts.map(item => item.color);

    this.monthlyChart.update();
    this.categoryChart.update();
    this.accountChart.update();
  }


  private getCssVariable(name: string): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  private formatCurrency(amountInCents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amountInCents / 100);
  }

  private formatCompactCurrency(valueInReais: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(valueInReais);
  }




}
