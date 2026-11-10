
import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';

import {
  Transaction,
  TransactionAccount,
  TransactionCategory,
  TransactionCreate,
  TransactionListItem,
  TransactionUpdate
} from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class TransactionsService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private get userId(): string {
    const user = this.auth.currentUser();

    if (!user) {
      throw new Error('Usuário não autenticado.');
    }

    return user.id;
  }

  getTransactions(): Observable<TransactionListItem[]> {
    const userId = this.userId;

    return forkJoin({
      transactions: this.api.get<Transaction[]>(
        `/transactions?userId=${userId}`
      ),
      accounts: this.api.get<TransactionAccount[]>(
        `/accounts?userId=${userId}`
      ),
      categories: this.api.get<TransactionCategory[]>(
        `/categories?userId=${userId}`
      )
    }).pipe(
      map(({ transactions, accounts, categories }) => {
        return transactions
          .map(transaction => {
            const account = accounts.find(
              item => item.id === transaction.accountId
            );

            const category = categories.find(
              item => item.id === transaction.categoryId
            );

            return {
              ...transaction,
              accountName: account?.name ?? 'Conta não encontrada',
              categoryName: category?.name ?? 'Categoria não encontrada',
              categoryColor: category?.color ?? '#64748b'
            };
          })
          .sort((a, b) =>
            b.dueDate.localeCompare(a.dueDate)
          );
      })
    );
  }

  getExpenseAndIncomeCategories(): Observable<TransactionCategory[]> {
    return this.api.get<TransactionCategory[]>(
      `/categories?userId=${this.userId}`
    );
  }

  getActiveAccounts(): Observable<TransactionAccount[]> {
    return this.api.get<TransactionAccount[]>(
      `/accounts?userId=${this.userId}`
    ).pipe(
      map(accounts => accounts.filter(account => account.active))
    );
  }

  create(data: TransactionCreate): Observable<Transaction> {
    const userId = this.userId;

    return this.getReferences().pipe(
      switchMap(({ accounts, categories }) => {
        this.validate(data, accounts, categories);

        const payload: Omit<Transaction, 'id'> = {
          ...data,
          userId,
          description: data.description.trim(),
          notes: data.notes?.trim() ?? ''
        };

        return this.api.post<Transaction>(
          '/transactions',
          payload
        );
      })
    );
  }

  update(
    id: string,
    changes: TransactionUpdate
  ): Observable<Transaction> {
    const userId = this.userId;

    return this.api.get<Transaction>(
      `/transactions/${id}`
    ).pipe(
      switchMap(current => {
        if (current.userId !== userId) {
          return throwError(
            () => new Error('Você não tem permissão para editar esta transação.')
          );
        }

        const updated: TransactionCreate = {
          accountId: changes.accountId ?? current.accountId,
          categoryId: changes.categoryId ?? current.categoryId,
          description: changes.description ?? current.description,
          type: changes.type ?? current.type,
          amount: changes.amount ?? current.amount,
          dueDate: changes.dueDate ?? current.dueDate,
          paymentDate: changes.paymentDate !== undefined
            ? changes.paymentDate
            : current.paymentDate,
          status: changes.status ?? current.status,
          notes: changes.notes ?? current.notes
        };

        return this.getReferences().pipe(
          switchMap(({ accounts, categories }) => {
            this.validate(updated, accounts, categories);

            return this.api.patch<Transaction>(
              `/transactions/${id}`,
              {
                ...updated,
                description: updated.description.trim(),
                notes: updated.notes?.trim() ?? ''
              }
            );
          })
        );
      })
    );
  }

  delete(id: string): Observable<void> {
    const userId = this.userId;

    return this.api.get<Transaction>(
      `/transactions/${id}`
    ).pipe(
      switchMap(transaction => {
        if (transaction.userId !== userId) {
          return throwError(
            () => new Error('Você não tem permissão para excluir esta transação.')
          );
        }

        return this.api.delete<void>(`/transactions/${id}`);
      })
    );
  }

  private getReferences(): Observable<{
    accounts: TransactionAccount[];
    categories: TransactionCategory[];
  }> {
    const userId = this.userId;

    return forkJoin({
      accounts: this.api.get<TransactionAccount[]>(
        `/accounts?userId=${userId}`
      ),
      categories: this.api.get<TransactionCategory[]>(
        `/categories?userId=${userId}`
      )
    });
  }

  private validate(
    data: TransactionCreate,
    accounts: TransactionAccount[],
    categories: TransactionCategory[]
  ): void {
    if (!data.description?.trim()) {
      throw new Error('Informe a descrição da transação.');
    }

    if (data.description.trim().length < 2) {
      throw new Error('A descrição deve ter pelo menos 2 caracteres.');
    }

    if (
      !Number.isSafeInteger(data.amount) ||
      data.amount <= 0
    ) {
      throw new Error('Informe um valor válido para a transação.');
    }

    if (!this.isValidDate(data.dueDate)) {
      throw new Error('Informe uma data de vencimento válida.');
    }

    if (
      data.paymentDate &&
      !this.isValidDate(data.paymentDate)
    ) {
      throw new Error('Informe uma data de pagamento válida.');
    }

    if (
      !['income', 'expense'].includes(data.type)
    ) {
      throw new Error('Tipo de transação inválido.');
    }

    if (
      !['pending', 'paid', 'cancelled'].includes(data.status)
    ) {
      throw new Error('Status de transação inválido.');
    }

    const account = accounts.find(
      item =>
        item.id === data.accountId &&
        item.userId === this.userId &&
        item.active
    );

    if (!account) {
      throw new Error('Selecione uma conta ativa válida.');
    }

    const category = categories.find(
      item =>
        item.id === data.categoryId &&
        item.userId === this.userId &&
        item.type === data.type
    );

    if (!category) {
      throw new Error(
        'Selecione uma categoria válida para o tipo de transação.'
      );
    }

    if (data.status === 'paid' && !data.paymentDate) {
      throw new Error(
        'Informe a data de pagamento para uma transação paga.'
      );
    }

    if (data.status !== 'paid' && data.paymentDate) {
      throw new Error(
        'A data de pagamento deve ficar vazia para transações pendentes ou canceladas.'
      );
    }
  }

  private isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const date = new Date(`${value}T00:00:00`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }
}
