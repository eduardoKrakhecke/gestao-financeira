import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { GoalCreate, GoalSummary } from '../../models/goal.model';
import { CurrencyMaskDirective } from '../../../../shared/directives/currency-mask.directive';

@Component({
  selector: 'app-goal-form',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyMaskDirective],
  templateUrl: './goal-form.component.html',
  styleUrl: './goal-form.component.scss'
})
export class GoalFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() goal: GoalSummary | null = null;
  @Input() saving = false;

  @Output() save = new EventEmitter<GoalCreate>();
  @Output() cancel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    targetAmount: [0, [Validators.required, Validators.min(0.01)]],
    currentAmount: [0, [Validators.required, Validators.min(0)]],
    deadline: ['', Validators.required]
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['goal']) {
      if (this.goal) {
        this.form.reset({
          name: this.goal.name,
          targetAmount: this.goal.targetAmount / 100,
          currentAmount: this.goal.currentAmount / 100,
          deadline: this.goal.deadline
        });
      } else {
        this.form.reset({
          name: '',
          targetAmount: 0,
          currentAmount: 0,
          deadline: ''
        });
      }
    }

    if (changes['saving']) {
      if (this.saving) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    }
  }

  submit(): void {
    if (this.saving || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const targetAmount = Math.round(value.targetAmount * 100);
    const currentAmount = Math.round(value.currentAmount * 100);

    if (
      !Number.isSafeInteger(targetAmount) ||
      !Number.isSafeInteger(currentAmount) ||
      currentAmount > targetAmount
    ) {
      this.form.controls.currentAmount.setErrors({
        invalidAmount: true
      });
      return;
    }

    this.save.emit({
      name: value.name.trim(),
      targetAmount,
      currentAmount,
      deadline: value.deadline
    });
  }
}
