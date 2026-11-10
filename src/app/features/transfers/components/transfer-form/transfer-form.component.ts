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

import { AccountSummary } from '../../../accounts/models/account.model';
import {
  TransferCreate,
  TransferSummary
} from '../../models/transfer.model';
import { CommonModule } from '@angular/common';
import { CurrencyMaskDirective } from '../../../../shared/directives/currency-mask.directive';

@Component({
  selector: 'app-transfer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyMaskDirective],
  templateUrl: './transfer-form.component.html',
  styleUrl: './transfer-form.component.scss'
})
export class TransferFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() accounts: AccountSummary[] = [];
  @Input() transfer: TransferSummary | null = null;
  @Input() saving = false;

  @Output() save = new EventEmitter<TransferCreate>();
  @Output() cancel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    fromAccountId: ['', Validators.required],
    toAccountId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    date: [this.getToday(), Validators.required],
    description: ['', [Validators.required, Validators.maxLength(120)]]
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transfer']) {
      if (this.transfer) {
        this.form.reset({
          fromAccountId: this.transfer.fromAccountId,
          toAccountId: this.transfer.toAccountId,
          amount: this.transfer.amount / 100,
          date: this.transfer.date,
          description: this.transfer.description
        });
      } else {
        this.form.reset({
          fromAccountId: '',
          toAccountId: '',
          amount: 0,
          date: this.getToday(),
          description: ''
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

  get destinationAccounts(): AccountSummary[] {
    const sourceId = this.form.controls.fromAccountId.value;

    return this.accounts.filter(account =>
      account.id !== sourceId
    );
  }

  submit(): void {
    if (this.saving || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const amount = Math.round(value.amount * 100);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      this.form.controls.amount.setErrors({ invalidAmount: true });
      return;
    }

    if (value.fromAccountId === value.toAccountId) {
      this.form.controls.toAccountId.setErrors({ sameAccount: true });
      return;
    }

    this.save.emit({
      fromAccountId: value.fromAccountId,
      toAccountId: value.toAccountId,
      amount,
      date: value.date,
      description: value.description.trim()
    });
  }

  private getToday(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
