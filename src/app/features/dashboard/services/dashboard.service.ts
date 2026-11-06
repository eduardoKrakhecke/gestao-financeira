import { Injectable, inject } from '@angular/core';
import {
  forkJoin,
  map,
  Observable,
  throwError
} from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';

import {
  DashboardAccount,
  DashboardBudget,
  DashboardCategory,
  DashboardPeriod,
  DashboardSummary,
  DashboardTransaction,
  MonthlyEvolution
} from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  getDashboardData(
    period: DashboardPeriod = 'current-month'
  ): Observable<DashboardSummary> {

    const user = this.auth.currentUser();

    if (!user) {
      return throwError(
        () => new Error('Usuário não autenticado.')
      );
    }

    const userId = encodeURIComponent(user.id);

    return forkJoin({
      accounts: this.api.get<DashboardAccount[]>(
        `/accounts?userId=${userId}`
      ),
      transactions: this.api.get<DashboardTransaction[]>(
        `/transactions?userId=${userId}`
      ),
      categories: this.api.get<DashboardCategory[]>(
        `/categories?userId=${userId}`
      ),
      budgets: this.api.get<DashboardBudget[]>(
        `/budgets?userId=${userId}`
      )
    }).pipe(
      map(({ accounts, transactions, categories, budgets }) =>
        this.calculateDashboard(
          accounts,
          transactions,
          categories,
          budgets,
          period
        )
      )
    );
  }

  private calculateDashboard(
    accounts: DashboardAccount[],
    transactions: DashboardTransaction[],
    categories: DashboardCategory[],
    budgets: DashboardBudget[],
    period: DashboardPeriod
  ): DashboardSummary {

    const { startDate, endDate } = this.getPeriodDates(period);

    const currentMonth = endDate.slice(0, 7);

    const isInsidePeriod = (date: string | null): boolean => {
      if (!date) {
        return false;
      }

      return date >= startDate && date <= endDate;
    };

    // Separa as transações pagas e pendentes.
    // Transações canceladas não entram nos cálculos.
    const paidTransactions = transactions.filter(
      transaction => transaction.status === 'paid'
    );

    const pendingTransactions = transactions.filter(
      transaction => transaction.status === 'pending'
    );

    // Transações pagas dentro do período selecionado.
    const periodPaidTransactions = paidTransactions.filter(
      transaction => isInsidePeriod(transaction.paymentDate)
    );

    // Transações pendentes com vencimento dentro do período.
    const periodPendingTransactions = pendingTransactions.filter(
      transaction => isInsidePeriod(transaction.dueDate)
    );

    // Soma receitas ou despesas.
    const sumByType = (
      items: DashboardTransaction[],
      type: 'income' | 'expense'
    ): number => {
      return items
        .filter(transaction => transaction.type === type)
        .reduce(
          (total, transaction) => total + transaction.amount,
          0
        );
    };

    // Saldo inicial de todas as contas ativas.
    const totalInitialBalance = accounts
      .filter(account => account.active)
      .reduce(
        (total, account) => total + account.initialBalance,
        0
      );

    // Saldo atual considera todas as movimentações pagas.
    const totalPaidIncome = sumByType(
      paidTransactions,
      'income'
    );

    const totalPaidExpenses = sumByType(
      paidTransactions,
      'expense'
    );

    const totalBalance =
      totalInitialBalance +
      totalPaidIncome -
      totalPaidExpenses;

    // Receitas e despesas pendentes dentro do período.
    const pendingIncome = sumByType(
      periodPendingTransactions,
      'income'
    );

    const pendingExpenses = sumByType(
      periodPendingTransactions,
      'expense'
    );

    const projectedBalance =
      totalBalance +
      pendingIncome -
      pendingExpenses;

    // Receitas e despesas pagas dentro do período.
    const monthlyIncome = sumByType(
      periodPaidTransactions,
      'income'
    );

    const monthlyExpenses = sumByType(
      periodPaidTransactions,
      'expense'
    );

    // Calcula o saldo individual de cada conta.
    const accountSummaries = accounts
      .filter(account => account.active)
      .map(account => {

        const accountTransactions = paidTransactions.filter(
          transaction => transaction.accountId === account.id
        );

        const income = sumByType(
          accountTransactions,
          'income'
        );

        const expenses = sumByType(
          accountTransactions,
          'expense'
        );

        return {
          id: account.id,
          name: account.name,
          color: account.color,
          balance: account.initialBalance + income - expenses
        };
      });

    // Calcula despesas por categoria no período selecionado.
    const expenseByCategory = categories
      .filter(category => category.type === 'expense')
      .map(category => {

        const total = periodPaidTransactions
          .filter(
            transaction =>
              transaction.type === 'expense' &&
              transaction.categoryId === category.id
          )
          .reduce(
            (sum, transaction) => sum + transaction.amount,
            0
          );

        return {
          categoryId: category.id,
          name: category.name,
          color: category.color,
          total
        };
      })
      .filter(category => category.total > 0);

    const categoryTotal = expenseByCategory.reduce(
      (sum, category) => sum + category.total,
      0
    );

    const categorySummaries = expenseByCategory.map(category => ({
      ...category,
      percentage: categoryTotal > 0
        ? (category.total / categoryTotal) * 100
        : 0
    }));

    // Ordena as movimentações recentes dentro do período.
    const recentTransactions = transactions
      .filter(transaction =>
        isInsidePeriod(
          transaction.paymentDate ?? transaction.dueDate
        )
      )
      .sort((a, b) => {
        const dateA = a.paymentDate ?? a.dueDate;
        const dateB = b.paymentDate ?? b.dueDate;

        return dateB.localeCompare(dateA);
      })
      .slice(0, 5);

    // Retorna o resumo completo.
    return {
      totalBalance,
      projectedBalance,
      monthlyIncome,
      monthlyExpenses,
      pendingIncome,
      pendingExpenses,
      accounts: accountSummaries,
      categories: categorySummaries,
      recentTransactions,
      budgets: budgets.filter(
        budget => budget.month === currentMonth
      ),
      monthlyEvolution: this.calculateMonthlyEvolution(
        transactions
      )
    };
  }

  // Calcula a evolução financeira dos últimos seis meses.
  private calculateMonthlyEvolution(
    transactions: DashboardTransaction[]
  ): MonthlyEvolution[] {

    const result: MonthlyEvolution[] = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {

      const date = new Date(
        today.getFullYear(),
        today.getMonth() - i,
        1
      );

      const month = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0')
      ].join('-');

      const monthlyTransactions = transactions.filter(
        transaction =>
          transaction.status === 'paid' &&
          transaction.paymentDate?.startsWith(month)
      );

      const income = monthlyTransactions
        .filter(transaction => transaction.type === 'income')
        .reduce(
          (total, transaction) => total + transaction.amount,
          0
        );

      const expenses = monthlyTransactions
        .filter(transaction => transaction.type === 'expense')
        .reduce(
          (total, transaction) => total + transaction.amount,
          0
        );

      result.push({
        month: date.toLocaleDateString('pt-BR', {
          month: 'short'
        }),
        income,
        expenses
      });
    }

    return result;
  }

  // Define as datas inicial e final conforme o filtro selecionado.
  private getPeriodDates(
    period: DashboardPeriod
  ): {
    startDate: string;
    endDate: string;
  } {

    const today = new Date();

    const endDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')
    ].join('-');

    let start: Date;

    switch (period) {

      case 'last-3-months':
        start = new Date(
          today.getFullYear(),
          today.getMonth() - 2,
          1
        );
        break;

      case 'last-6-months':
        start = new Date(
          today.getFullYear(),
          today.getMonth() - 5,
          1
        );
        break;

      case 'current-year':
        start = new Date(
          today.getFullYear(),
          0,
          1
        );
        break;

      case 'current-month':
      default:
        start = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );
        break;
    }

    const startDate = [
      start.getFullYear(),
      String(start.getMonth() + 1).padStart(2, '0'),
      String(start.getDate()).padStart(2, '0')
    ].join('-');

    return {
      startDate,
      endDate
    };
  }
}
