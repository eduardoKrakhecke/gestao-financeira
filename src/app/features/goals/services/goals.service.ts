
import { Injectable, inject } from '@angular/core';
import { map, Observable, switchMap, throwError } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';

import {
  Goal,
  GoalCreate,
  GoalSummary,
  GoalUpdate
} from '../models/goal.model';

@Injectable({
  providedIn: 'root'
})
export class GoalsService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private getUserId(): string {
    const user = this.auth.currentUser();

    if (!user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    return user.id;
  }

  getGoals(): Observable<GoalSummary[]> {
    const userId = this.getUserId();

    return this.api.get<Goal[]>(
      `/goals?userId=${encodeURIComponent(userId)}`
    ).pipe(
      map(goals => goals.map(goal => this.toSummary(goal)))
    );
  }

  private toSummary(goal: Goal): GoalSummary {
    const percentage = goal.targetAmount > 0
      ? (goal.currentAmount / goal.targetAmount) * 100
      : 0;

    const remaining = Math.max(
      goal.targetAmount - goal.currentAmount,
      0
    );

    let calculatedStatus: GoalSummary['calculatedStatus'];

    if (
      goal.status === 'completed' ||
      goal.currentAmount >= goal.targetAmount
    ) {
      calculatedStatus = 'completed';
    } else if (this.isOverdue(goal.deadline)) {
      calculatedStatus = 'overdue';
    } else {
      calculatedStatus = 'active';
    }

    return {
      ...goal,
      percentage,
      remaining,
      calculatedStatus
    };
  }

  private isOverdue(deadline: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(`${deadline}T00:00:00`);

    return !Number.isNaN(deadlineDate.getTime()) &&
      deadlineDate < today;
  }

  private validateGoal(data: GoalCreate): void {
    if (!data.name?.trim()) {
      throw new Error('Informe o nome da meta.');
    }

    if (
      !Number.isSafeInteger(data.targetAmount) ||
      data.targetAmount <= 0
    ) {
      throw new Error('O valor desejado deve ser maior que zero.');
    }

    if (
      !Number.isSafeInteger(data.currentAmount) ||
      data.currentAmount < 0
    ) {
      throw new Error('O valor acumulado não pode ser negativo.');
    }

    if (data.currentAmount > data.targetAmount) {
      throw new Error(
        'O valor acumulado não pode ser maior que o valor desejado.'
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.deadline)) {
      throw new Error('Informe um prazo válido.');
    }

    const deadlineDate = new Date(`${data.deadline}T00:00:00`);

    if (Number.isNaN(deadlineDate.getTime())) {
      throw new Error('Informe um prazo válido.');
    }
  }

  createGoal(data: GoalCreate): Observable<Goal> {
    const userId = this.getUserId();

    try {
      this.validateGoal(data);
    } catch (error) {
      return throwError(() => error);
    }

    const goal: Omit<Goal, 'id'> = {
      ...data,
      name: data.name.trim(),
      userId,
      status: data.currentAmount >= data.targetAmount
        ? 'completed'
        : 'active'
    };

    return this.api.post<Goal>('/goals', goal);
  }

  updateGoal(
    id: string,
    data: GoalUpdate
  ): Observable<Goal> {
    const userId = this.getUserId();

    return this.api.get<Goal>(
      `/goals/${encodeURIComponent(id)}`
    ).pipe(
      switchMap(currentGoal => {
        if (currentGoal.userId !== userId) {
          return throwError(
            () => new Error(
              'Você não tem permissão para editar esta meta.'
            )
          );
        }

        const updatedData: GoalCreate = {
          name: data.name ?? currentGoal.name,
          targetAmount: data.targetAmount ?? currentGoal.targetAmount,
          currentAmount: data.currentAmount ?? currentGoal.currentAmount,
          deadline: data.deadline ?? currentGoal.deadline
        };

        try {
          this.validateGoal(updatedData);
        } catch (error) {
          return throwError(() => error);
        }

        const status = updatedData.currentAmount >= updatedData.targetAmount
          ? 'completed'
          : 'active';

        return this.api.patch<Goal>(
          `/goals/${encodeURIComponent(id)}`,
          {
            ...updatedData,
            name: updatedData.name.trim(),
            status
          }
        );
      })
    );
  }

  deleteGoal(id: string): Observable<void> {
    const userId = this.getUserId();

    return this.api.get<Goal>(
      `/goals/${encodeURIComponent(id)}`
    ).pipe(
      switchMap(goal => {
        if (goal.userId !== userId) {
          return throwError(
            () => new Error(
              'Você não tem permissão para excluir esta meta.'
            )
          );
        }

        return this.api.delete<void>(
          `/goals/${encodeURIComponent(id)}`
        );
      })
    );
  }
}
