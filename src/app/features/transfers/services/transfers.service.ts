import { Injectable, inject } from '@angular/core';
import {
  forkJoin,
  map,
  Observable,
  switchMap,
  throwError
} from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AccountsService } from '../../accounts/services/accounts.service';

import { AccountSummary } from '../../accounts/models/account.model';

import {
  Transfer,
  TransferCreate,
  TransferSummary,
  TransferUpdate
} from '../models/transfer.model';

@Injectable({
  providedIn: 'root'
})
export class TransfersService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly accountsService = inject(AccountsService);

  private getUserId(): string {
    const user = this.auth.currentUser();

    if (!user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    return user.id;
  }


  getTransfers(): Observable<TransferSummary[]> {
    const userId = this.getUserId();

    return forkJoin({
      transfers: this.api.get<Transfer[]>(
        `/transfers?userId=${encodeURIComponent(userId)}`
      ),
      accounts: this.accountsService.getAccounts()
    }).pipe(
      map(({ transfers, accounts }) =>
        transfers
          .map(transfer => this.toSummary(transfer, accounts))
          .sort((a, b) => b.date.localeCompare(a.date))
      )
    );
  }

  private toSummary(
    transfer: Transfer,
    accounts: AccountSummary[]
  ): TransferSummary {
    return {
      ...transfer,
      fromAccountName: accounts.find(
        account => account.id === transfer.fromAccountId
      )?.name ?? 'Conta não encontrada',
      toAccountName: accounts.find(
        account => account.id === transfer.toAccountId
      )?.name ?? 'Conta não encontrada'
    };
  }


  private validateTransfer(data: TransferCreate): void {
    if (!data.fromAccountId || !data.toAccountId) {
      throw new Error('Selecione as contas de origem e destino.');
    }

    if (data.fromAccountId === data.toAccountId) {
      throw new Error('A conta de origem deve ser diferente da conta de destino.');
    }

    if (!Number.isSafeInteger(data.amount) || data.amount <= 0) {
      throw new Error('Informe um valor de transferência válido.');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new Error('Informe uma data válida.');
    }

    const parsedDate = new Date(`${data.date}T00:00:00`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== data.date
    ) {
      throw new Error('Informe uma data válida.');
    }

    if (!data.description?.trim()) {
      throw new Error('Informe uma descrição para a transferência.');
    }
  }

  private validateAccounts(
    accounts: AccountSummary[],
    data: TransferCreate
  ): { source: AccountSummary; destination: AccountSummary } {
    const source = accounts.find(
      account => account.id === data.fromAccountId
    );

    const destination = accounts.find(
      account => account.id === data.toAccountId
    );

    if (!source || !destination) {
      throw new Error('Conta de origem ou destino não encontrada.');
    }

    if (!source.active || !destination.active) {
      throw new Error('As duas contas precisam estar ativas.');
    }

    return { source, destination };
  }

  createTransfer(data: TransferCreate): Observable<Transfer> {
    const userId = this.getUserId();

    try {
      this.validateTransfer(data);
    } catch (error) {
      return throwError(() => error);
    }

    return this.accountsService.getAccounts().pipe(
      switchMap(accounts => {
        let validatedAccounts: {
          source: AccountSummary;
          destination: AccountSummary;
        };

        try {
          validatedAccounts = this.validateAccounts(accounts, data);
        } catch (error) {
          return throwError(() => error);
        }

        if (validatedAccounts.source.balance < data.amount) {
          return throwError(
            () => new Error('Saldo insuficiente na conta de origem.')
          );
        }

        return this.api.post<Transfer>('/transfers', {
          ...data,
          description: data.description.trim(),
          userId
        });
      })
    );
  }

  updateTransfer(
    id: string,
    data: TransferUpdate
  ): Observable<Transfer> {
    const userId = this.getUserId();

    return this.api.get<Transfer>(
      `/transfers/${encodeURIComponent(id)}`
    ).pipe(
      switchMap(currentTransfer => {
        if (currentTransfer.userId !== userId) {
          return throwError(
            () => new Error('Você não tem permissão para editar esta transferência.')
          );
        }

        const updatedData: TransferCreate = {
          fromAccountId: data.fromAccountId ?? currentTransfer.fromAccountId,
          toAccountId: data.toAccountId ?? currentTransfer.toAccountId,
          amount: data.amount ?? currentTransfer.amount,
          date: data.date ?? currentTransfer.date,
          description: data.description ?? currentTransfer.description
        };

        try {
          this.validateTransfer(updatedData);
        } catch (error) {
          return throwError(() => error);
        }

        return this.accountsService.getAccounts().pipe(
          switchMap(accounts => {
            let validatedAccounts: {
              source: AccountSummary;
              destination: AccountSummary;
            };

            try {
              validatedAccounts = this.validateAccounts(
                accounts,
                updatedData
              );
            } catch (error) {
              return throwError(() => error);
            }

            const sourceBalanceBeforeEdit =
              validatedAccounts.source.balance +
              (currentTransfer.fromAccountId === updatedData.fromAccountId
                ? currentTransfer.amount
                : 0) -
              (currentTransfer.toAccountId === updatedData.fromAccountId
                ? currentTransfer.amount
                : 0);

            if (sourceBalanceBeforeEdit < updatedData.amount) {
              return throwError(
                () => new Error('Saldo insuficiente na conta de origem.')
              );
            }

            return this.api.patch<Transfer>(
              `/transfers/${encodeURIComponent(id)}`,
              {
                ...updatedData,
                description: updatedData.description.trim()
              }
            );
          })
        );
      })
    );
  }

  deleteTransfer(id: string): Observable<void> {
    const userId = this.getUserId();

    return this.api.get<Transfer>(
      `/transfers/${encodeURIComponent(id)}`
    ).pipe(
      switchMap(transfer => {
        if (transfer.userId !== userId) {
          return throwError(
            () => new Error('Você não tem permissão para excluir esta transferência.')
          );
        }

        return this.api.delete<void>(
          `/transfers/${encodeURIComponent(id)}`
        );
      })
    );
  }
}
