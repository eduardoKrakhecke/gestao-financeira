
import { Injectable, inject } from '@angular/core';
import {
  forkJoin,
  map,
  Observable,
  switchMap,
  throwError
} from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';

import {
  Account,
  AccountCreate,
  AccountSummary,
  AccountTransaction,
  AccountTransfer,
  AccountUpdate
} from '../models/account.model';

@Injectable({
  providedIn: 'root'
})
export class AccountsService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private getUserId(): string {
    const user = this.auth.currentUser();

    if (!user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    return user.id;
  }

  getAccounts(): Observable<AccountSummary[]> {
    const userId = this.getUserId();
    const query = `userId=${encodeURIComponent(userId)}`;

    return forkJoin({
      accounts: this.api.get<Account[]>(`/accounts?${query}`),
      transactions: this.api.get<AccountTransaction[]>(
        `/transactions?${query}`
      ),
      transfers: this.api.get<AccountTransfer[]>(
        `/transfers?${query}`
      )
    }).pipe(
      map(({ accounts, transactions, transfers }) => {
        return accounts.map(account => {
          const accountTransactions = transactions.filter(
            transaction =>
              transaction.accountId === account.id &&
              transaction.status === 'paid'
          );

          const totalIncome = accountTransactions
            .filter(transaction => transaction.type === 'income')
            .reduce((total, transaction) => total + transaction.amount, 0);

          const totalExpenses = accountTransactions
            .filter(transaction => transaction.type === 'expense')
            .reduce((total, transaction) => total + transaction.amount, 0);

          const accountTransfers = transfers.filter(
            transfer =>
              transfer.fromAccountId === account.id ||
              transfer.toAccountId === account.id
          );

          const totalTransfersIn = accountTransfers
            .filter(transfer => transfer.toAccountId === account.id)
            .reduce((total, transfer) => total + transfer.amount, 0);

          const totalTransfersOut = accountTransfers
            .filter(transfer => transfer.fromAccountId === account.id)
            .reduce((total, transfer) => total + transfer.amount, 0);

          const balance =
            account.initialBalance +
            totalIncome -
            totalExpenses +
            totalTransfersIn -
            totalTransfersOut;

          return {
            ...account,
            balance,
            totalIncome,
            totalExpenses,
            totalTransfersIn,
            totalTransfersOut
          };
        });
      })
    );
  }

  getAccount(id: string): Observable<Account> {
    const userId = this.getUserId();

    return this.api.get<Account>(
      `/accounts/${encodeURIComponent(id)}`
    ).pipe(
      switchMap(account => {
        if (account.userId !== userId) {
          return throwError(
            () => new Error('Conta não encontrada ou sem permissão de acesso.')
          );
        }

        return [account];
      })
    );
  }

  private validateAccount(data: AccountCreate): void {
    const validTypes = ['checking', 'cash', 'savings', 'credit'];

    if (!data.name?.trim()) {
      throw new Error('Informe o nome da conta.');
    }

    if (!validTypes.includes(data.type)) {
      throw new Error('Tipo de conta inválido.');
    }

    if (
      !Number.isSafeInteger(data.initialBalance) ||
      data.initialBalance < 0
    ) {
      throw new Error('Informe um saldo inicial válido em centavos.');
    }

    if (!data.currency?.trim()) {
      throw new Error('Informe a moeda da conta.');
    }

    if (!data.color?.trim()) {
      throw new Error('Informe uma cor para a conta.');
    }
  }

  createAccount(data: AccountCreate): Observable<Account> {
    const userId = this.getUserId();

    try {
      this.validateAccount(data);
    } catch (error) {
      return throwError(() => error);
    }

    return this.api.post<Account>('/accounts', {
      ...data,
      name: data.name.trim(),
      userId,
      active: true
    });
  }

  updateAccount(
    id: string,
    data: AccountUpdate
  ): Observable<Account> {
    const userId = this.getUserId();

    return this.getAccount(id).pipe(
      switchMap(account => {
        const updatedData: AccountCreate = {
          name: data.name ?? account.name,
          type: data.type ?? account.type,
          initialBalance: data.initialBalance ?? account.initialBalance,
          currency: data.currency ?? account.currency,
          color: data.color ?? account.color
        };

        try {
          this.validateAccount(updatedData);
        } catch (error) {
          return throwError(() => error);
        }

        return this.api.patch<Account>(
          `/accounts/${encodeURIComponent(id)}`,
          {
            ...updatedData,
            name: updatedData.name.trim(),
            userId
          }
        );
      })
    );
  }

  deleteAccount(id: string): Observable<void> {
    const userId = this.getUserId();

    return this.getAccount(id).pipe(
      switchMap(() =>
        forkJoin({
          transactions: this.api.get<AccountTransaction[]>(
            `/transactions?userId=${encodeURIComponent(userId)}&accountId=${encodeURIComponent(id)}`
          ),
          transfersFrom: this.api.get<AccountTransfer[]>(
            `/transfers?userId=${encodeURIComponent(userId)}&fromAccountId=${encodeURIComponent(id)}`
          ),
          transfersTo: this.api.get<AccountTransfer[]>(
            `/transfers?userId=${encodeURIComponent(userId)}&toAccountId=${encodeURIComponent(id)}`
          )
        })
      ),
      switchMap(({ transactions, transfersFrom, transfersTo }) => {
        if (
          transactions.length > 0 ||
          transfersFrom.length > 0 ||
          transfersTo.length > 0
        ) {
          return throwError(
            () => new Error(
              'Não é possível excluir uma conta que possui histórico de movimentações.'
            )
          );
        }

        return this.api.delete<void>(
          `/accounts/${encodeURIComponent(id)}`
        );
      })
    );
  }
}
