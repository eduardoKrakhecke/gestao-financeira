import { computed, inject, Injectable, signal } from '@angular/core';

import { StorageService } from '../services/storage.service';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';
import { map, Observable, switchMap, throwError } from 'rxjs';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface ApiUser extends AuthUser {
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly storage = inject(StorageService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly token = signal<string | null>(
    this.storage.get('auth_token')
  );

  private readonly userState = signal<AuthUser | null>(
    this.loadStoredUser()
  );

  readonly isAuthenticated = computed(() => !!this.token());
  readonly currentUser = this.userState.asReadonly();

  private loadStoredUser(): AuthUser | null {
    const storedUser = this.storage.get('auth_user');

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as AuthUser;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this.token();
  }

  login(email: string, password: string): Observable<AuthUser> {
    const query = `/users?email=${encodeURIComponent(email.trim())}`;

    return this.api.get<ApiUser[]>(query).pipe(
      map(users => {
        const user = users.find(item => item.password === password);

        if (!user) {
          throw new Error('E-mail ou senha inválidos.');
        }

        const authenticatedUser: AuthUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar
        };

        // Token demonstrativo: não representa um JWT real.
        const demoToken = `demo-token-${user.id}-${Date.now()}`;

        this.storage.set('auth_token', demoToken);
        this.storage.set('auth_user', JSON.stringify(authenticatedUser));

        this.token.set(demoToken);
        this.userState.set(authenticatedUser);

        return authenticatedUser;
      })
    );
  }

  logout(): void {
    this.storage.remove('auth_token');
    this.storage.remove('auth_user');

    this.token.set(null);
    this.userState.set(null);

    void this.router.navigate(['/login']);
  }

  getUserInitials(): string {
    const name = this.currentUser()?.name;

    if (!name) {
      return 'U';
    }

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }

  register(
    name: string,
    email: string,
    password: string
  ): Observable<AuthUser> {
    const normalizedEmail = email.trim().toLowerCase();

    return this.api
      .get<ApiUser[]>(`/users?email=${encodeURIComponent(normalizedEmail)}`)
      .pipe(
        switchMap(users => {
          if (users.length > 0) {
            return throwError(
              () => new Error('Este e-mail já está cadastrado.')
            );
          }

          const newUser = {
            name: name.trim(),
            email: normalizedEmail,
            password,
            avatar: null,
            createdAt: new Date().toISOString()
          };

          return this.api.post<ApiUser>('/users', newUser).pipe(
            map(user => {
              const authenticatedUser: AuthUser = {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
              };

              // Token demonstrativo, não é um JWT real.
              const demoToken = `demo-token-${user.id}-${Date.now()}`;

              this.storage.set('auth_token', demoToken);
              this.storage.set(
                'auth_user',
                JSON.stringify(authenticatedUser)
              );

              this.token.set(demoToken);
              this.userState.set(authenticatedUser);

              return authenticatedUser;
            })
          );
        })
      );
  }




}
