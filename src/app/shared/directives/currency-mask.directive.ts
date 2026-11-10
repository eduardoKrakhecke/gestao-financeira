import {
  Directive,
  ElementRef,
  forwardRef,
  HostListener,
  OnInit,
  inject
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: 'input[appCurrencyMask]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyMaskDirective),
      multi: true
    }
  ]
})
export class CurrencyMaskDirective implements ControlValueAccessor, OnInit {
  private readonly element = inject(ElementRef<HTMLInputElement>);

  private onChange: (value: number) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngOnInit(): void {
    this.element.nativeElement.inputMode = 'decimal';
    this.element.nativeElement.autocomplete = 'off';
  }

  writeValue(value: number | null): void {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      this.element.nativeElement.value = '';
      return;
    }

    this.element.nativeElement.value = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numericValue);
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.element.nativeElement.disabled = isDisabled;
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    const cents = digits ? Number(digits) : 0;
    const value = cents / 100;

    this.onChange(value);

    if (!digits) {
      input.value = '';
      return;
    }

    this.writeValue(value);
    input.setSelectionRange(input.value.length, input.value.length);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();

    if (!this.element.nativeElement.value) {
      this.writeValue(0);
    }
  }
}
