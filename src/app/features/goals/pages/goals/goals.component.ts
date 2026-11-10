import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { GoalFormComponent } from '../../components/goal-form/goal-form.component';
import { GoalCreate, GoalStatus, GoalSummary } from '../../models/goal.model';
import { GoalsService } from '../../services/goals.service';

type GoalFilter = 'all' | GoalStatus;

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, GoalFormComponent],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.scss'
})
export class GoalsComponent implements OnInit {
  private readonly goalsService = inject(GoalsService);

  readonly goals = signal<GoalSummary[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal<string | null>(null);

  readonly filter = signal<GoalFilter>('all');
  readonly formVisible = signal(false);
  readonly selectedGoal = signal<GoalSummary | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly Math = Math;

  readonly filteredGoals = computed(() => {
    const status = this.filter();

    return status === 'all'
      ? this.goals()
      : this.goals().filter(goal => goal.calculatedStatus === status);
  });

  readonly totalGoals = computed(() => this.goals().length);

  readonly activeGoals = computed(() =>
    this.goals().filter(goal => goal.calculatedStatus === 'active').length
  );

  readonly completedGoals = computed(() =>
    this.goals().filter(goal => goal.calculatedStatus === 'completed').length
  );

  readonly overdueGoals = computed(() =>
    this.goals().filter(goal => goal.calculatedStatus === 'overdue').length
  );

  readonly totalTarget = computed(() =>
    this.goals().reduce((sum, goal) => sum + goal.targetAmount, 0)
  );

  readonly totalAccumulated = computed(() =>
    this.goals().reduce((sum, goal) => sum + goal.currentAmount, 0)
  );

  ngOnInit(): void {
    this.loadGoals();
  }

  loadGoals(): void {
    this.loading.set(true);
    this.error.set(null);

    this.goalsService.getGoals().subscribe({
      next: goals => {
        this.goals.set(goals);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar as metas.');
        this.loading.set(false);
      }
    });
  }

  changeFilter(value: string): void {
    const allowed: GoalFilter[] = [
      'all', 'active', 'completed', 'overdue'
    ];

    if (allowed.includes(value as GoalFilter)) {
      this.filter.set(value as GoalFilter);
    }
  }

  openCreateForm(): void {
    this.selectedGoal.set(null);
    this.formVisible.set(true);
    this.error.set(null);
  }

  openEditForm(goal: GoalSummary): void {
    this.selectedGoal.set(goal);
    this.formVisible.set(true);
    this.error.set(null);
  }

  closeForm(): void {
    if (this.saving()) {
      return;
    }

    this.formVisible.set(false);
    this.selectedGoal.set(null);
  }

  saveGoal(data: GoalCreate): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const selected = this.selectedGoal();

    const request = selected
      ? this.goalsService.updateGoal(selected.id, data)
      : this.goalsService.createGoal(data);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadGoals();
      },
      error: error => {
        this.saving.set(false);
        this.error.set(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar a meta.'
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

    this.goalsService.deleteGoal(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deletingId.set(null);
        this.loadGoals();
      },
      error: () => {
        this.deleting.set(false);
        this.deletingId.set(null);
        this.error.set('Não foi possível excluir a meta.');
      }
    });
  }

  formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
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
