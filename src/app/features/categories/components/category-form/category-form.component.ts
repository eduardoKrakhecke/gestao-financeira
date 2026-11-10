
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  Category,
  CategoryCreate
} from '../../models/category.model';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.scss'
})
export class CategoryFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() category: Category | null = null;
  @Input() saving = false;

  @Output() save = new EventEmitter<CategoryCreate>();
  @Output() cancel = new EventEmitter<void>();

  readonly colors = [
    '#16a34a',
    '#2563eb',
    '#f97316',
    '#8b5cf6',
    '#ec4899',
    '#eab308',
    '#06b6d4',
    '#64748b',
    '#ef4444',
    '#14b8a6'
  ];

  readonly icons = [
    { value: 'wallet', label: 'Carteira' },
    { value: 'utensils', label: 'Alimentação' },
    { value: 'house', label: 'Moradia' },
    { value: 'car', label: 'Transporte' },
    { value: 'heart', label: 'Saúde' },
    { value: 'graduation-cap', label: 'Educação' },
    { value: 'shopping-bag', label: 'Compras' },
    { value: 'gamepad', label: 'Lazer' },
    { value: 'briefcase', label: 'Trabalho' },
    { value: 'gift', label: 'Presentes' },
    { value: 'chart-line', label: 'Investimentos' },
    { value: 'circle-dollar-sign', label: 'Outros' }
  ];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    type: ['expense' as 'income' | 'expense', Validators.required],
    color: ['#2563eb', Validators.required],
    icon: ['wallet', Validators.required]
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['category']) {
      if (this.category) {
        this.form.patchValue({
          name: this.category.name,
          type: this.category.type,
          color: this.category.color,
          icon: this.category.icon
        });
      } else {
        this.form.reset({
          name: '',
          type: 'expense',
          color: '#2563eb',
          icon: 'wallet'
        });
      }
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit(this.form.getRawValue());
  }
}
