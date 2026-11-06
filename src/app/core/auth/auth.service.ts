import { computed, inject, Injectable, signal } from '@angular/core';

import { StorageService } from '../services/storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage = inject(StorageService);
  private readonly token = signal(this.storage.get('auth_token'));

  readonly isAuthenticated = computed(() => this.token() !== null);

  getToken(): string | null {
    return this.token();
  }

  login(token: string): void {
    this.storage.set('auth_token', token);
    this.token.set(token);
  }

  logout(): void {
    this.storage.remove('auth_token');
    this.token.set(null);
  }
}
