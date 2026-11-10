import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AccountFormComponent } from '../../components/account-form/account-form.component';
import { AccountCreate, AccountSummary } from '../../models/account.model';
import { AccountsService } from '../../services/accounts.service';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, AccountFormComponent],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss'
})
export class AccountsComponent implements OnInit {
  private readonly accountsService = inject(AccountsService);

  readonly accounts = signal<AccountSummary[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal<string | null>(null);

  readonly formVisible = signal(false);
  readonly selectedAccount = signal<AccountSummary | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly activeAccounts = computed(() =>
    this.accounts().filter(account => account.active)
  );

  readonly totalBalance = computed(() =>
    this.activeAccounts().reduce(
      (total, account) => total + account.balance,
      0
    )
  );

  readonly totalIncome = computed(() =>
    this.activeAccounts().reduce(
      (total, account) => total + account.totalIncome,
      0
    )
  );

  readonly totalExpenses = computed(() =>
    this.activeAccounts().reduce(
      (total, account) => total + account.totalExpenses,
      0
    )
  );

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.accountsService.getAccounts().subscribe({
      next: accounts => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: error => {
        this.error.set(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar as contas.'
        );
        this.loading.set(false);
      }
    });
  }

  openCreateForm(): void {
    this.selectedAccount.set(null);
    this.error.set(null);
    this.formVisible.set(true);
  }

  openEditForm(account: AccountSummary): void {
    this.selectedAccount.set(account);
    this.error.set(null);
    this.formVisible.set(true);
  }

  closeForm(): void {
    if (this.saving()) {
      return;
    }

    this.formVisible.set(false);
    this.selectedAccount.set(null);
  }

  saveAccount(data: AccountCreate): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const selected = this.selectedAccount();

    const request = selected
      ? this.accountsService.updateAccount(selected.id, data)
      : this.accountsService.createAccount(data);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formVisible.set(false);
        this.selectedAccount.set(null);
        this.loadAccounts();
      },
      error: error => {
        this.saving.set(false);
        this.error.set(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar a conta.'
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
    if (this.deleting()) {
      return;
    }

    this.deleting.set(true);
    this.error.set(null);

    this.accountsService.deleteAccount(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deletingId.set(null);
        this.loadAccounts();
      },
      error: error => {
        this.deleting.set(false);
        this.deletingId.set(null);
        this.error.set(
          error instanceof Error
            ? error.message
            : 'Não foi possível excluir a conta.'
        );
      }
    });
  }

  getAccountTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      checking: 'Conta corrente',
      cash: 'Carteira',
      savings: 'Poupança',
      credit: 'Conta de crédito'
    };

    return labels[type] ?? 'Outra conta';
  }

  formatCurrency(amountInCents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amountInCents / 100);
  }
}
