
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { TransactionFormComponent } from '../../components/transaction-form/transaction-form.component';
import { TransactionsService } from '../../services/transactions.service';

import {
  Transaction,
  TransactionAccount,
  TransactionCategory,
  TransactionCreate,
  TransactionListItem,
  TransactionStatus,
  TransactionType
} from '../../models/transaction.model';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, TransactionFormComponent],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent {
  private readonly transactionsService = inject(TransactionsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  readonly transactions = signal<TransactionListItem[]>([]);
  readonly accounts = signal<TransactionAccount[]>([]);
  readonly categories = signal<TransactionCategory[]>([]);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly formOpen = signal(false);
  readonly selectedTransaction = signal<TransactionListItem | null>(null);
  readonly transactionToDelete = signal<TransactionListItem | null>(null);
  readonly deleting = signal(false);

  readonly search = signal('');
  readonly typeFilter = signal<TransactionType | 'all'>('all');
  readonly statusFilter = signal<TransactionStatus | 'all'>('all');
  readonly categoryFilter = signal('all');
  readonly accountFilter = signal('all');
  readonly startDate = signal('');
  readonly endDate = signal('');

  readonly currentPage = signal(1);
  readonly pageSize = 8;

  readonly filteredTransactions = computed(() => {
    const search = this.search().trim().toLowerCase();
    const type = this.typeFilter();
    const status = this.statusFilter();
    const categoryId = this.categoryFilter();
    const accountId = this.accountFilter();
    const start = this.startDate();
    const end = this.endDate();

    return this.transactions().filter(transaction => {
      const matchesSearch =
        !search ||
        transaction.description.toLowerCase().includes(search) ||
        transaction.categoryName.toLowerCase().includes(search) ||
        transaction.accountName.toLowerCase().includes(search);

      const matchesType =
        type === 'all' || transaction.type === type;

      const matchesStatus =
        status === 'all' || transaction.status === status;

      const matchesCategory =
        categoryId === 'all' || transaction.categoryId === categoryId;

      const matchesAccount =
        accountId === 'all' || transaction.accountId === accountId;

      const matchesStart =
        !start || transaction.dueDate >= start;

      const matchesEnd =
        !end || transaction.dueDate <= end;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesCategory &&
        matchesAccount &&
        matchesStart &&
        matchesEnd
      );
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredTransactions().length / this.pageSize))
  );

  readonly paginatedTransactions = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;

    return this.filteredTransactions().slice(
      start,
      start + this.pageSize
    );
  });

  readonly totalIncome = computed(() =>
    this.transactions()
      .filter(item => item.type === 'income' && item.status !== 'cancelled')
      .reduce((total, item) => total + item.amount, 0)
  );

  readonly totalExpenses = computed(() =>
    this.transactions()
      .filter(item => item.type === 'expense' && item.status !== 'cancelled')
      .reduce((total, item) => total + item.amount, 0)
  );

  readonly pendingCount = computed(() =>
    this.transactions().filter(item => item.status === 'pending').length
  );

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      transactions: this.transactionsService.getTransactions(),
      accounts: this.transactionsService.getActiveAccounts(),
      categories: this.transactionsService.getExpenseAndIncomeCategories()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this.transactions.set(result.transactions);
          this.accounts.set(result.accounts);
          this.categories.set(result.categories);
          this.loading.set(false);
        },
        error: error => {
          this.error.set(
            error?.error?.message ||
            error?.message ||
            'Não foi possível carregar as transações.'
          );
          this.loading.set(false);
        }
      });
  }

  openCreateForm(): void {
    this.selectedTransaction.set(null);
    this.success.set('');
    this.error.set('');
    this.formOpen.set(true);
  }

  openEditForm(transaction: TransactionListItem): void {
    this.selectedTransaction.set(transaction);
    this.success.set('');
    this.error.set('');
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (this.saving()) {
      return;
    }

    this.formOpen.set(false);
    this.selectedTransaction.set(null);
  }

  saveTransaction(data: TransactionCreate): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const selected = this.selectedTransaction();

    const request = selected
      ? this.transactionsService.update(selected.id, data)
      : this.transactionsService.create(data);

    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.formOpen.set(false);
          this.selectedTransaction.set(null);
          this.success.set(
            selected
              ? 'Transação atualizada com sucesso.'
              : 'Transação cadastrada com sucesso.'
          );
          this.loadData();
        },
        error: error => {
          this.saving.set(false);
          this.error.set(
            error?.error?.message ||
            error?.message ||
            'Não foi possível salvar a transação.'
          );
        }
      });
  }

  askDelete(transaction: TransactionListItem): void {
    this.transactionToDelete.set(transaction);
  }

  cancelDelete(): void {
    if (!this.deleting()) {
      this.transactionToDelete.set(null);
    }
  }

  confirmDelete(): void {
    const transaction = this.transactionToDelete();

    if (!transaction || this.deleting()) {
      return;
    }

    this.deleting.set(true);
    this.error.set('');

    this.transactionsService.delete(transaction.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.transactionToDelete.set(null);
          this.success.set('Transação excluída com sucesso.');
          this.loadData();
        },
        error: error => {
          this.deleting.set(false);
          this.error.set(
            error?.error?.message ||
            error?.message ||
            'Não foi possível excluir a transação.'
          );
        }
      });
  }

  clearFilters(): void {
    this.search.set('');
    this.typeFilter.set('all');
    this.statusFilter.set('all');
    this.categoryFilter.set('all');
    this.accountFilter.set('all');
    this.startDate.set('');
    this.endDate.set('');
    this.currentPage.set(1);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onFilterChange(): void {
    this.currentPage.set(1);
  }

  exportCsv(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const headers = [
      'Descrição',
      'Tipo',
      'Categoria',
      'Conta',
      'Valor',
      'Vencimento',
      'Pagamento',
      'Status',
      'Observações'
    ];

    const rows = this.filteredTransactions().map(item => [
      item.description,
      item.type === 'income' ? 'Receita' : 'Despesa',
      item.categoryName,
      item.accountName,
      (item.amount / 100).toFixed(2).replace('.', ','),
      item.dueDate,
      item.paymentDate ?? '',
      this.getStatusLabel(item.status),
      item.notes ?? ''
    ]);

    const csv = [headers, ...rows]
      .map(row =>
        row.map(value =>
          `"${String(value).replace(/"/g, '""')}"`
        ).join(';')
      )
      .join('\r\n');

    const blob = new Blob(
      ['\uFEFF', csv],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');

    link.href = url;
    link.download = 'financeflow-transacoes.csv';
    link.click();

    URL.revokeObjectURL(url);
  }

  getStatusLabel(status: TransactionStatus): string {
    const labels: Record<TransactionStatus, string> = {
      pending: 'Pendente',
      paid: 'Pago',
      cancelled: 'Cancelado'
    };

    return labels[status];
  }

  trackById(
    _index: number,
    transaction: Transaction
  ): string {
    return transaction.id;
  }
}
