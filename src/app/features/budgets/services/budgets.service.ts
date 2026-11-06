import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, switchMap, throwError } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';

import {
  Budget,
  BudgetCategory,
  BudgetCreate,
  BudgetSummary,
  BudgetTransaction,
  BudgetUpdate
} from '../models/budget.model';

@Injectable({
  providedIn: 'root'
})
export class BudgetsService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);


  private getUserId(): string {
    const user = this.auth.currentUser();

    if (!user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    return user.id;
  }


  getBudgets(month: string): Observable<BudgetSummary[]> {
    const userId = this.getUserId();

    const query = `userId=${encodeURIComponent(userId)}`;

    return forkJoin({
      budgets: this.api.get<Budget[]>(
        `/budgets?${query}&month=${encodeURIComponent(month)}`
      ),
      categories: this.api.get<BudgetCategory[]>(
        `/categories?${query}`
      ),
      transactions: this.api.get<BudgetTransaction[]>(
        `/transactions?${query}`
      )
    }).pipe(
      map(({ budgets, categories, transactions }) => {
        return budgets.map(budget => {
          const category = categories.find(
            item => item.id === budget.categoryId
          );

          const spent = transactions
            .filter(transaction =>
              transaction.categoryId === budget.categoryId &&
              transaction.type === 'expense' &&
              transaction.status === 'paid' &&
              transaction.paymentDate?.startsWith(month)
            )
            .reduce((total, transaction) => total + transaction.amount, 0);

          const remaining = budget.limit - spent;

          const percentage = budget.limit > 0
            ? (spent / budget.limit) * 100
            : 0;

          let status: BudgetSummary['status'] = 'normal';

          if (percentage >= 100) {
            status = 'exceeded';
          } else if (percentage >= 80) {
            status = 'warning';
          }

          return {
            ...budget,
            categoryName: category?.name ?? 'Categoria não encontrada',
            categoryColor: category?.color ?? '#64748b',
            spent,
            remaining,
            percentage,
            status
          };
        });
      })
    );
  }


  getExpenseCategories(): Observable<BudgetCategory[]> {
    const userId = this.getUserId();

    return this.api
      .get<BudgetCategory[]>(
        `/categories?userId=${encodeURIComponent(userId)}`
      )
      .pipe(
        map(categories =>
          categories.filter(category => category.type === 'expense')
        )
      );
  }


  createBudget(data: BudgetCreate): Observable<Budget> {
    const userId = this.getUserId();

    return this.api.get<Budget[]>(
      `/budgets?userId=${encodeURIComponent(userId)}&month=${encodeURIComponent(data.month)}`
    ).pipe(
      switchMap(budgets => {
        const alreadyExists = budgets.some(
          budget => budget.categoryId === data.categoryId
        );

        if (alreadyExists) {
          return throwError(
            () => new Error('Já existe um orçamento para essa categoria neste mês.')
          );
        }

        return this.api.post<Budget>('/budgets', {
          ...data,
          userId
        });
      })
    );
  }

  updateBudget(id: string, data: BudgetUpdate): Observable<Budget> {
    this.getUserId();

    return this.api.patch<Budget>(
      `/budgets/${encodeURIComponent(id)}`,
      data
    );
  }


  deleteBudget(id: string): Observable<void> {
    this.getUserId();

    return this.api.delete<void>(
      `/budgets/${encodeURIComponent(id)}`
    );
  }
}
