
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap, throwError } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { AuthService, AuthUser } from '../../../core/auth/auth.service';

import {
  PasswordUpdate,
  UserProfileUpdate
} from '../models/settings.model';

interface SettingsApiUser extends AuthUser {
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  updateProfile(data: UserProfileUpdate): Observable<AuthUser> {
    const currentUser = this.auth.currentUser();

    if (!currentUser) {
      return throwError(() => new Error('Usuário não autenticado.'));
    }

    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();

    if (name.length < 2) {
      return throwError(
        () => new Error('Informe um nome com pelo menos 2 caracteres.')
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return throwError(() => new Error('Informe um e-mail válido.'));
    }

    return this.api
      .get<SettingsApiUser[]>(`/users?email=${encodeURIComponent(email)}`)
      .pipe(
        switchMap(users => {
          const emailInUse = users.some(
            user => user.id !== currentUser.id
          );

          if (emailInUse) {
            return throwError(
              () => new Error('Este e-mail já está sendo utilizado.')
            );
          }

          return this.api
            .patch<SettingsApiUser>(`/users/${currentUser.id}`, {
              name,
              email,
              avatar: data.avatar
            })
            .pipe(
              map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
              }))
            );
        })
      );
  }

  updatePassword(data: PasswordUpdate): Observable<void> {
    const currentUser = this.auth.currentUser();

    if (!currentUser) {
      return throwError(() => new Error('Usuário não autenticado.'));
    }

    if (!data.currentPassword || !data.newPassword) {
      return throwError(
        () => new Error('Preencha todos os campos de senha.')
      );
    }

    if (data.newPassword.length < 8) {
      return throwError(
        () => new Error('A nova senha deve ter pelo menos 8 caracteres.')
      );
    }

    if (data.currentPassword === data.newPassword) {
      return throwError(
        () => new Error('A nova senha deve ser diferente da atual.')
      );
    }

    return this.api
      .get<SettingsApiUser>(`/users/${currentUser.id}`)
      .pipe(
        switchMap(user => {
          if (user.password !== data.currentPassword) {
            return throwError(
              () => new Error('A senha atual está incorreta.')
            );
          }

          return this.api
            .patch<SettingsApiUser>(`/users/${currentUser.id}`, {
              password: data.newPassword
            })
            .pipe(map(() => undefined));
        })
      );
  }
}
