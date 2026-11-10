import { Component, EventEmitter, inject, Input, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BudgetCategory, BudgetCreate, BudgetSummary } from '../../models/budget.model';
import { CurrencyMaskDirective } from '../../../../shared/directives/currency-mask.directive';

@Component({
  selector: 'app-budget-form',
  imports: [ReactiveFormsModule, CurrencyMaskDirective],
  standalone: true,
  templateUrl: './budget-form.component.html',
  styleUrl: './budget-form.component.scss'
})
export class BudgetFormComponent {

  private readonly fb = inject(FormBuilder);

  @Input() categories: BudgetCategory[] = [];
  @Input() budget: BudgetSummary | null = null;

  @Output() save = new EventEmitter<BudgetCreate>();
  @Output() cancel = new EventEmitter<void>();


  readonly form = this.fb.nonNullable.group({
    categoryId: ['', Validators.required],
    month: [this.getCurrentMonth(), Validators.required],
    limit: [0, [Validators.required, Validators.min(0.01)]]
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['budget'] || changes['categories']) {
      this.updateForm();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.save.emit({
      categoryId: value.categoryId,
      month: value.month,
      limit: Math.round(Number(value.limit) * 100)
    });
  }

  private updateForm(): void {
    if (this.budget) {
      this.form.patchValue({
        categoryId: this.budget.categoryId,
        month: this.budget.month,
        limit: this.budget.limit / 100
      });
      return;
    }

    this.form.reset({
      categoryId: '',
      month: this.getCurrentMonth(),
      limit: 0
    });
  }

  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    return `${year}-${month}`;
  }
}
