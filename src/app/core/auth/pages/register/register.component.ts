import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../auth.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  standalone: true,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  readonly loading = signal(false);
  readonly errorMessage = signal('');


  onSubmit(): void {
    this.errorMessage.set('');

    if (this.loading()) {
      return;
    }

    if (
      !this.name.trim() ||
      !this.email.trim() ||
      !this.password ||
      !this.confirmPassword
    ) {
      this.errorMessage.set('Preencha todos os campos.');
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage.set(
        'A senha precisa ter pelo menos 8 caracteres.'
      );
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('As senhas não são iguais.');
      return;
    }

    this.loading.set(true);

    this.authService.register(
      this.name,
      this.email,
      this.password
    ).subscribe({
      next: () => {
        void this.router.navigate(['/dashboard']);
      },
      error: (error: unknown) => {
        this.loading.set(false);

        if (
          error instanceof Error &&
          error.message === 'Este e-mail já está cadastrado.'
        ) {
          this.errorMessage.set(error.message);
          return;
        }

        this.errorMessage.set(
          'Não foi possível realizar o cadastro. Verifique a conexão com a API.'
        );
      }
    });
  }


}
