import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  onSubmit(): void {
    if (this.loading()) {
      return;
    }

    this.errorMessage.set('');

    if (!this.email.trim() || !this.password) {
      this.errorMessage.set('Informe seu e-mail e sua senha.');
      return;
    }

    this.loading.set(true);

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

        const destination =
          returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
            ? returnUrl
            : '/dashboard';

        void this.router.navigateByUrl(destination);
      },
      error: (error: unknown) => {
        if (error instanceof Error && error.message === 'E-mail ou senha inválidos.') {
          this.errorMessage.set(error.message);
        } else {
          this.errorMessage.set(
            'Não foi possível conectar ao servidor. Verifique se a API está funcionando.'
          );
        }

        this.loading.set(false);
      }
    });

  }

}
