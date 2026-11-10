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

import {
  AccountCreate,
  AccountSummary,
  AccountType
} from '../../models/account.model';
import { CurrencyMaskDirective } from '../../../../shared/directives/currency-mask.directive';

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyMaskDirective],
  templateUrl: './account-form.component.html',
  styleUrl: './account-form.component.scss'
})
export class AccountFormComponent implements OnChanges {
   readonly fb = inject(FormBuilder);

  @Input() account: AccountSummary | null = null;
  @Input() saving = false;

  @Output() save = new EventEmitter<AccountCreate>();
  @Output() cancel = new EventEmitter<void>();

  readonly accountTypes: { value: AccountType; label: string }[] = [
    { value: 'checking', label: 'Conta corrente' },
    { value: 'cash', label: 'Carteira / Dinheiro' },
    { value: 'savings', label: 'Poupança' },
    { value: 'credit', label: 'Conta de crédito' }
  ];

   form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    type: ['checking' as AccountType, Validators.required],
    initialBalance: [0, [Validators.required, Validators.min(0)]],
    currency: ['BRL', Validators.required],
    color: ['#2563eb', Validators.required]
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['account']) {
      if (this.account) {
        this.form.reset({
          name: this.account.name,
          type: this.account.type,
          initialBalance: this.account.initialBalance / 100,
          currency: this.account.currency,
          color: this.account.color
        });
      } else {
        this.form.reset({
          name: '',
          type: 'checking',
          initialBalance: 0,
          currency: 'BRL',
          color: '#2563eb'
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
    const initialBalance = Math.round(value.initialBalance * 100);

    if (!Number.isSafeInteger(initialBalance)) {
      this.form.controls.initialBalance.setErrors({
        invalidAmount: true
      });
      return;
    }

    this.save.emit({
      name: value.name.trim(),
      type: value.type,
      initialBalance,
      currency: value.currency,
      color: value.color
    });
  }
}
