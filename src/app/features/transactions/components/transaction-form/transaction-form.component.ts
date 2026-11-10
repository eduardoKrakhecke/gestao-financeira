
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  Transaction,
  TransactionAccount,
  TransactionCategory,
  TransactionCreate,
  TransactionListItem,
  TransactionStatus,
  TransactionType
} from '../../models/transaction.model';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transaction-form.component.html',
  styleUrl: './transaction-form.component.scss'
})
export class TransactionFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() transaction: Transaction | TransactionListItem | null = null;
  @Input() accounts: TransactionAccount[] = [];
  @Input() categories: TransactionCategory[] = [];
  @Input() saving = false;

  @Output() save = new EventEmitter<TransactionCreate>();
  @Output() cancel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    description: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)]
    ],
    amount: ['', [Validators.required]],
    type: ['expense' as TransactionType, Validators.required],
    categoryId: ['', Validators.required],
    accountId: ['', Validators.required],
    dueDate: [this.getToday(), Validators.required],
    paymentDate: [''],
    status: ['pending' as TransactionStatus, Validators.required],
    notes: ['', Validators.maxLength(500)]
  });

  get filteredCategories(): TransactionCategory[] {
    const type = this.form.controls.type.value;

    return this.categories.filter(category => category.type === type);
  }

  get isPaid(): boolean {
    return this.form.controls.status.value === 'paid';
  }

  get isEditing(): boolean {
    return !!this.transaction;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transaction']) {
      this.populateForm();
    }
  }

  onTypeChange(): void {
    this.form.controls.categoryId.setValue('');
  }

  onStatusChange(): void {
    const status = this.form.controls.status.value;
    const paymentDate = this.form.controls.paymentDate;

    if (status === 'paid') {
      paymentDate.setValidators([Validators.required]);
      if (!paymentDate.value) {
        paymentDate.setValue(this.getToday());
      }
    } else {
      paymentDate.clearValidators();
      paymentDate.setValue('');
    }

    paymentDate.updateValueAndValidity();
  }

  submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const amountInReais = Number(
      value.amount.replace(',', '.')
    );

    if (!Number.isFinite(amountInReais) || amountInReais <= 0) {
      this.form.controls.amount.setErrors({ invalidAmount: true });
      return;
    }

    const amountInCents = Math.round(amountInReais * 100);

    const payload: TransactionCreate = {
      description: value.description.trim(),
      amount: amountInCents,
      type: value.type,
      categoryId: value.categoryId,
      accountId: value.accountId,
      dueDate: value.dueDate,
      paymentDate: value.status === 'paid'
        ? value.paymentDate
        : null,
      status: value.status,
      notes: value.notes.trim()
    };

    this.save.emit(payload);
  }

  private populateForm(): void {
    if (!this.transaction) {
      this.form.reset({
        description: '',
        amount: '',
        type: 'expense',
        categoryId: '',
        accountId: '',
        dueDate: this.getToday(),
        paymentDate: '',
        status: 'pending',
        notes: ''
      });

      this.onStatusChange();
      return;
    }

    this.form.patchValue({
      description: this.transaction.description,
      amount: (this.transaction.amount / 100).toFixed(2),
      type: this.transaction.type,
      categoryId: this.transaction.categoryId,
      accountId: this.transaction.accountId,
      dueDate: this.transaction.dueDate,
      paymentDate: this.transaction.paymentDate ?? '',
      status: this.transaction.status,
      notes: this.transaction.notes ?? ''
    });

    this.onStatusChange();
  }

  private getToday(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
