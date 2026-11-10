
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, switchMap, throwError } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';

import {
  Category,
  CategoryCreate,
  CategoryType,
  CategoryUpdate,
  CategoryUsage
} from '../models/category.model';

interface CategoryTransaction {
  id: string;
  userId: string;
  categoryId: string;
}

interface CategoryBudget {
  id: string;
  userId: string;
  categoryId: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private getUserId(): string {
    const userId = this.auth.currentUser()?.id;

    if (!userId) {
      throw new Error('Usuário não autenticado.');
    }

    return userId;
  }

  getCategories(): Observable<Category[]> {
    const userId = this.getUserId();

    return this.api.get<Category[]>(
      `/categories?userId=${encodeURIComponent(userId)}`
    ).pipe(
      map(categories =>
        [...categories].sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR')
        )
      )
    );
  }

  createCategory(data: CategoryCreate): Observable<Category> {
    const userId = this.getUserId();
    const validationError = this.validateCategory(data);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    return this.getCategories().pipe(
      switchMap(categories => {
        if (this.hasDuplicate(categories, data)) {
          return throwError(
            () => new Error('Já existe uma categoria com esse nome e tipo.')
          );
        }

        return this.api.post<Category>('/categories', {
          ...data,
          userId,
          name: data.name.trim()
        });
      })
    );
  }

  updateCategory(
    id: string,
    data: CategoryUpdate
  ): Observable<Category> {
    const userId = this.getUserId();

    return this.api.get<Category>(`/categories/${id}`).pipe(
      switchMap(category => {
        if (category.userId !== userId) {
          return throwError(
            () => new Error('Categoria não encontrada para este usuário.')
          );
        }

        const updated: CategoryCreate = {
          name: data.name ?? category.name,
          type: data.type ?? category.type,
          color: data.color ?? category.color,
          icon: data.icon ?? category.icon
        };

        const validationError = this.validateCategory(updated);

        if (validationError) {
          return throwError(() => new Error(validationError));
        }

        return this.getCategories().pipe(
          switchMap(categories => {
            if (this.hasDuplicate(categories, updated, id)) {
              return throwError(
                () => new Error('Já existe uma categoria com esse nome e tipo.')
              );
            }

            return this.api.patch<Category>(
              `/categories/${id}`,
              {
                ...updated,
                name: updated.name.trim()
              }
            );
          })
        );
      })
    );
  }

  getCategoryUsage(categoryId: string): Observable<CategoryUsage> {
    const userId = this.getUserId();

    return forkJoin({
      transactions: this.api.get<CategoryTransaction[]>(
        `/transactions?userId=${encodeURIComponent(userId)}&categoryId=${encodeURIComponent(categoryId)}`
      ),
      budgets: this.api.get<CategoryBudget[]>(
        `/budgets?userId=${encodeURIComponent(userId)}&categoryId=${encodeURIComponent(categoryId)}`
      )
    }).pipe(
      map(({ transactions, budgets }) => ({
        transactions: transactions.length,
        budgets: budgets.length,
        total: transactions.length + budgets.length
      }))
    );
  }

  deleteCategory(id: string): Observable<void> {
    const userId = this.getUserId();

    return this.api.get<Category>(`/categories/${id}`).pipe(
      switchMap(category => {
        if (category.userId !== userId) {
          return throwError(
            () => new Error('Categoria não encontrada para este usuário.')
          );
        }

        return this.getCategoryUsage(id).pipe(
          switchMap(usage => {
            if (usage.total > 0) {
              const details: string[] = [];

              if (usage.transactions > 0) {
                details.push(`${usage.transactions} transação(ões)`);
              }

              if (usage.budgets > 0) {
                details.push(`${usage.budgets} orçamento(s)`);
              }

              return throwError(
                () => new Error(
                  `Não é possível excluir. A categoria está vinculada a ${details.join(' e ')}.`
                )
              );
            }

            return this.api.delete<void>(`/categories/${id}`);
          })
        );
      })
    );
  }

  private validateCategory(data: CategoryCreate): string | null {
    if (!data.name?.trim() || data.name.trim().length < 2) {
      return 'O nome deve possuir pelo menos 2 caracteres.';
    }

    if (data.name.trim().length > 40) {
      return 'O nome deve possuir no máximo 40 caracteres.';
    }

    if (data.type !== 'income' && data.type !== 'expense') {
      return 'Tipo de categoria inválido.';
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(data.color)) {
      return 'Selecione uma cor válida.';
    }

    if (!data.icon?.trim()) {
      return 'Selecione um ícone.';
    }

    return null;
  }

  private hasDuplicate(
    categories: Category[],
    data: CategoryCreate,
    ignoreId?: string
  ): boolean {
    const normalizedName = data.name.trim().toLocaleLowerCase('pt-BR');

    return categories.some(category =>
      category.id !== ignoreId &&
      category.type === data.type &&
      category.name.trim().toLocaleLowerCase('pt-BR') === normalizedName
    );
  }
}
