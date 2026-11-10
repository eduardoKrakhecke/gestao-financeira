
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../../core/auth/auth.service';
import { ThemeService, Theme } from '../../../../core/services/theme.service';

import { SettingsService } from '../../services/settings.service';
import { UserPreferences } from '../../models/settings.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly themeService = inject(ThemeService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly user = this.auth.currentUser;
  readonly theme = this.themeService.theme;

  readonly activeTab = signal<'profile' | 'appearance' | 'preferences' | 'security'>('profile');

  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly avatarPreview = signal<string | null>(
    this.user()?.avatar ?? null
  );

  readonly preferences = signal<UserPreferences>({
    currency: 'BRL',
    dateFormat: 'dd/MM/yyyy',
    language: 'pt-BR'
  });

  readonly profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]]
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  });

  constructor() {
    const user = this.user();

    if (user) {
      this.profileForm.patchValue({
        name: user.name,
        email: user.email
      });
    }

    this.loadPreferences();
  }

  getUserInitials(): string {
    return this.auth.getUserInitials();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Selecione um arquivo de imagem válido.');
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage.set('A foto deve ter no máximo 2 MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.avatarPreview.set(reader.result);
        this.clearMessages();
      }
    };

    reader.onerror = () => {
      this.errorMessage.set('Não foi possível carregar a foto.');
    };

    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.avatarPreview.set(null);
    this.clearMessages();
  }

  selectTab(
    tab: 'profile' | 'appearance' | 'preferences' | 'security'
  ): void {
    this.activeTab.set(tab);
    this.clearMessages();
  }

  saveProfile(): void {
    this.clearMessages();

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);

    this.settingsService.updateProfile({
      ...this.profileForm.getRawValue(),
      avatar: this.avatarPreview()
    })
      .subscribe({
        next: user => {
          this.auth.updateCurrentUser(user);
          this.profileForm.patchValue({
            name: user.name,
            email: user.email
          });
          this.avatarPreview.set(user.avatar);

          this.savingProfile.set(false);
          this.successMessage.set('Perfil atualizado com sucesso.');
        },
        error: error => {
          this.savingProfile.set(false);
          this.errorMessage.set(
            error?.error?.message ||
            error?.message ||
            'Não foi possível atualizar o perfil.'
          );
        }
      });
  }

  changeTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
    this.successMessage.set(
      theme === 'dark'
        ? 'Tema escuro ativado.'
        : 'Tema claro ativado.'
    );
    this.errorMessage.set('');
  }

  savePreferences(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(
      'finance-flow-preferences',
      JSON.stringify(this.preferences())
    );

    this.successMessage.set('Preferências salvas com sucesso.');
    this.errorMessage.set('');
  }

  updateDateFormat(value: string): void {
    if (value !== 'dd/MM/yyyy' && value !== 'MM/dd/yyyy') {
      return;
    }

    this.preferences.update(current => ({
      ...current,
      dateFormat: value
    }));
  }

  changePassword(): void {
    this.clearMessages();

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const values = this.passwordForm.getRawValue();

    if (values.newPassword !== values.confirmPassword) {
      this.errorMessage.set('A confirmação da senha não corresponde.');
      return;
    }

    this.savingPassword.set(true);

    this.settingsService.updatePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword
    }).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.successMessage.set('Senha alterada com sucesso.');
      },
      error: error => {
        this.savingPassword.set(false);
        this.errorMessage.set(
          error?.error?.message ||
          error?.message ||
          'Não foi possível alterar a senha.'
        );
      }
    });
  }

  logout(): void {
    this.auth.logout();
  }

  private loadPreferences(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const stored = localStorage.getItem('finance-flow-preferences');

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<UserPreferences>;

      this.preferences.set({
        currency: 'BRL',
        language: 'pt-BR',
        dateFormat:
          parsed.dateFormat === 'MM/dd/yyyy'
            ? 'MM/dd/yyyy'
            : 'dd/MM/yyyy'
      });
    } catch {
      localStorage.removeItem('finance-flow-preferences');
    }
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }
}
