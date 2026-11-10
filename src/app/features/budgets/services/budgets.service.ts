
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

  /**
   * Lista os orçamentos de um determinado mês.
   */
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
            .reduce(
              (total, transaction) => total + transaction.amount,
              0
            );

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

  /**
   * Lista somente categorias de despesas do usuário.
   */
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

  /**
   * Valida os dados financeiros do orçamento.
   */
  private validateBudgetData(data: BudgetCreate): void {
    if (!data.categoryId) {
      throw new Error('Selecione uma categoria.');
    }

    if (!/^\d{4}-\d{2}$/.test(data.month)) {
      throw new Error('Informe um mês válido.');
    }

    const monthNumber = Number(data.month.split('-')[1]);

    if (monthNumber < 1 || monthNumber > 12) {
      throw new Error('Informe um mês válido.');
    }

    if (!Number.isSafeInteger(data.limit) || data.limit <= 0) {
      throw new Error('O limite deve ser um valor positivo em centavos.');
    }
  }

  /**
   * Valida se a categoria pertence ao usuário e é de despesa.
   */
  private validateCategory(
    categories: BudgetCategory[],
    categoryId: string
  ): void {
    const category = categories.find(
      item => item.id === categoryId
    );

    if (!category) {
      throw new Error('Categoria não encontrada ou não pertence ao usuário.');
    }

    if (category.type !== 'expense') {
      throw new Error('Orçamentos só podem utilizar categorias de despesas.');
    }
  }

  /**
   * Cadastra um orçamento.
   */
  createBudget(data: BudgetCreate): Observable<Budget> {
    const userId = this.getUserId();

    try {
      this.validateBudgetData(data);
    } catch (error) {
      return throwError(() => error);
    }

    return forkJoin({
      budgets: this.api.get<Budget[]>(
        `/budgets?userId=${encodeURIComponent(userId)}&month=${encodeURIComponent(data.month)}`
      ),
      categories: this.getExpenseCategories()
    }).pipe(
      switchMap(({ budgets, categories }) => {
        this.validateCategory(categories, data.categoryId);

        const alreadyExists = budgets.some(
          budget => budget.categoryId === data.categoryId
        );

        if (alreadyExists) {
          return throwError(
            () => new Error(
              'Já existe um orçamento para essa categoria neste mês.'
            )
          );
        }

        return this.api.post<Budget>('/budgets', {
          ...data,
          userId
        });
      })
    );
  }

  /**
   * Atualiza um orçamento existente.
   * Verifica propriedade, categoria e duplicidade.
   */
  updateBudget(
    id: string,
    data: BudgetUpdate
  ): Observable<Budget> {
    const userId = this.getUserId();

    return this.api.get<Budget>(
      `/budgets/${encodeURIComponent(id)}`
    ).pipe(
      switchMap(currentBudget => {
        if (currentBudget.userId !== userId) {
          return throwError(
            () => new Error('Você não tem permissão para editar este orçamento.')
          );
        }

        const updatedData: BudgetCreate = {
          categoryId: data.categoryId ?? currentBudget.categoryId,
          month: data.month ?? currentBudget.month,
          limit: data.limit ?? currentBudget.limit
        };

        try {
          this.validateBudgetData(updatedData);
        } catch (error) {
          return throwError(() => error);
        }

        return forkJoin({
          budgets: this.api.get<Budget[]>(
            `/budgets?userId=${encodeURIComponent(userId)}&month=${encodeURIComponent(updatedData.month)}`
          ),
          categories: this.getExpenseCategories()
        }).pipe(
          switchMap(({ budgets, categories }) => {
            this.validateCategory(
              categories,
              updatedData.categoryId
            );

            const duplicate = budgets.some(
              budget =>
                budget.categoryId === updatedData.categoryId &&
                budget.id !== id
            );

            if (duplicate) {
              return throwError(
                () => new Error(
                  'Já existe outro orçamento para essa categoria neste mês.'
                )
              );
            }

            return this.api.patch<Budget>(
              `/budgets/${encodeURIComponent(id)}`,
              updatedData
            );
          })
        );
      })
    );
  }

  deleteBudget(id: string): Observable<void> {
    const userId = this.getUserId();

    return this.api.get<Budget>(
      `/budgets/${encodeURIComponent(id)}`
    ).pipe(
      switchMap(budget => {
        if (budget.userId !== userId) {
          return throwError(
            () => new Error('Você não tem permissão para excluir este orçamento.')
          );
        }

        return this.api.delete<void>(
          `/budgets/${encodeURIComponent(id)}`
        );
      })
    );
  }
}
