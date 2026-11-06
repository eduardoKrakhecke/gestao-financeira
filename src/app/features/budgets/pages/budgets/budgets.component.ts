import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { BudgetFormComponent } from '../../components/budget-form/budget-form.component';
import { BudgetsService } from '../../services/budgets.service';

import {
  BudgetCategory,
  BudgetCreate,
  BudgetSummary
} from '../../models/budget.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule,BudgetFormComponent],
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.scss'
})
export class BudgetsComponent implements OnInit {
  private readonly budgetsService = inject(BudgetsService);

  readonly budgets = signal<BudgetSummary[]>([]);
  readonly categories = signal<BudgetCategory[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly formVisible = signal(false);
  readonly selectedBudget = signal<BudgetSummary | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly month = signal(this.getCurrentMonth());
  readonly Math = Math;

  readonly totalLimit = computed(() =>
    this.budgets().reduce((total, budget) => total + budget.limit, 0)
  );

  readonly totalSpent = computed(() =>
    this.budgets().reduce((total, budget) => total + budget.spent, 0)
  );

  readonly totalRemaining = computed(() =>
    this.totalLimit() - this.totalSpent()
  );

  readonly overallPercentage = computed(() =>
    this.totalLimit() > 0
      ? (this.totalSpent() / this.totalLimit()) * 100
      : 0
  );

  ngOnInit(): void {
    this.loadCategories();
    this.loadBudgets();
  }

  loadCategories(): void {
    this.budgetsService.getExpenseCategories().subscribe({
      next: categories => this.categories.set(categories),
      error: () => this.error.set('Não foi possível carregar as categorias.')
    });
  }

  loadBudgets(): void {
    this.loading.set(true);
    this.error.set(null);

    this.budgetsService.getBudgets(this.month()).subscribe({
      next: budgets => {
        this.budgets.set(budgets);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar os orçamentos.');
        this.loading.set(false);
      }
    });
  }

  changeMonth(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.value) {
      return;
    }

    this.month.set(input.value);
    this.loadBudgets();
  }

  openCreateForm(): void {
    this.selectedBudget.set(null);
    this.formVisible.set(true);
  }

  openEditForm(budget: BudgetSummary): void {
    this.selectedBudget.set(budget);
    this.formVisible.set(true);
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.selectedBudget.set(null);
  }

  saveBudget(data: BudgetCreate): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const selected = this.selectedBudget();

    const request = selected
      ? this.budgetsService.updateBudget(selected.id, data)
      : this.budgetsService.createBudget(data);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();

        if (data.month !== this.month()) {
          this.month.set(data.month);
        }

        this.loadBudgets();
      },
      error: error => {
        this.saving.set(false);
        this.error.set(
          error?.error?.message ||
          error?.message ||
          'Não foi possível salvar o orçamento.'
        );
      }
    });
  }

  askDelete(id: string): void {
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  confirmDelete(id: string): void {
    this.budgetsService.deleteBudget(id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.loadBudgets();
      },
      error: () => {
        this.error.set('Não foi possível excluir o orçamento.');
        this.deletingId.set(null);
      }
    });
  }

  formatCurrency(amountInCents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amountInCents / 100);
  }

  private getCurrentMonth(): string {
    const now = new Date();

    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0')
    ].join('-');
  }
}
