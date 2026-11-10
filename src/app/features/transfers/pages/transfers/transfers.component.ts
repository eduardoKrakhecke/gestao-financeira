import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { AccountsService } from '../../../accounts/services/accounts.service';
import { AccountSummary } from '../../../accounts/models/account.model';

import { TransferFormComponent } from '../../components/transfer-form/transfer-form.component';
import {
  TransferCreate,
  TransferSummary
} from '../../models/transfer.model';
import { TransfersService } from '../../services/transfers.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [RouterLink,CommonModule, TransferFormComponent],
  templateUrl: './transfers.component.html',
  styleUrl: './transfers.component.scss'
})
export class TransfersComponent implements OnInit {
  private readonly accountsService = inject(AccountsService);
  private readonly transfersService = inject(TransfersService);

  readonly accounts = signal<AccountSummary[]>([]);
  readonly transfers = signal<TransferSummary[]>([]);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly error = signal<string | null>(null);

  readonly formVisible = signal(false);
  readonly selectedTransfer = signal<TransferSummary | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly activeAccounts = computed(() =>
    this.accounts().filter(account => account.active)
  );

  readonly totalTransferred = computed(() =>
    this.transfers().reduce(
      (total, transfer) => total + transfer.amount,
      0
    )
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      accounts: this.accountsService.getAccounts(),
      transfers: this.transfersService.getTransfers()
    }).subscribe({
      next: ({ accounts, transfers }) => {
        this.accounts.set(accounts);
        this.transfers.set(transfers);
        this.loading.set(false);
      },
      error: error => {
        this.error.set(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar as transferências.'
        );
        this.loading.set(false);
      }
    });
  }

  openCreateForm(): void {
    this.selectedTransfer.set(null);
    this.error.set(null);
    this.formVisible.set(true);
  }

  openEditForm(transfer: TransferSummary): void {
    this.selectedTransfer.set(transfer);
    this.error.set(null);
    this.formVisible.set(true);
  }

  closeForm(): void {
    if (this.saving()) {
      return;
    }

    this.formVisible.set(false);
    this.selectedTransfer.set(null);
  }

  saveTransfer(data: TransferCreate): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const selected = this.selectedTransfer();

    const request = selected
      ? this.transfersService.updateTransfer(selected.id, data)
      : this.transfersService.createTransfer(data);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formVisible.set(false);
        this.selectedTransfer.set(null);
        this.loadData();
      },
      error: error => {
        this.saving.set(false);
        this.error.set(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar a transferência.'
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

    this.transfersService.deleteTransfer(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deletingId.set(null);
        this.loadData();
      },
      error: error => {
        this.deleting.set(false);
        this.deletingId.set(null);
        this.error.set(
          error instanceof Error
            ? error.message
            : 'Não foi possível excluir a transferência.'
        );
      }
    });
  }

  formatCurrency(amountInCents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amountInCents / 100);
  }

  formatDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);

    if (!year || !month || !day) {
      return date;
    }

    return new Intl.DateTimeFormat('pt-BR').format(
      new Date(year, month - 1, day)
    );
  }
}
