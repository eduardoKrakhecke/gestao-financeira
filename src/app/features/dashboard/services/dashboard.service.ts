
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
  DashboardBudgetSummary,
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

    // Separa transações pagas e pendentes.
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

    // Função para somar receitas ou despesas.
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

    // Pendências dentro do período selecionado.
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

    // Receitas e despesas pagas no período.
    const monthlyIncome = sumByType(
      periodPaidTransactions,
      'income'
    );

    const monthlyExpenses = sumByType(
      periodPaidTransactions,
      'expense'
    );

    // Calcula o saldo individual das contas.
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

    // Calcula despesas por categoria no período.
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

    // Calcula o consumo dos orçamentos do mês atual.
    const currentMonthTransactions = paidTransactions.filter(
      transaction =>
        transaction.paymentDate?.startsWith(currentMonth)
    );

    const budgetSummaries: DashboardBudgetSummary[] = budgets
      .filter(budget => budget.month === currentMonth)
      .map(budget => {

        const category = categories.find(
          item => item.id === budget.categoryId
        );

        const spent = currentMonthTransactions
          .filter(
            transaction =>
              transaction.type === 'expense' &&
              transaction.categoryId === budget.categoryId
          )
          .reduce(
            (total, transaction) => total + transaction.amount,
            0
          );

        const percentage = budget.limit > 0
          ? (spent / budget.limit) * 100
          : 0;

        let status: 'normal' | 'warning' | 'exceeded' = 'normal';

        if (percentage >= 100) {
          status = 'exceeded';
        } else if (percentage >= 80) {
          status = 'warning';
        }

        return {
          id: budget.id,
          categoryId: budget.categoryId,
          categoryName: category?.name ?? 'Categoria não encontrada',
          color: category?.color ?? '#9ca3af',
          limit: budget.limit,
          spent,
          remaining: budget.limit - spent,
          percentage,
          status
        };
      });

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

    // Retorna todos os indicadores do Dashboard.
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
      budgets: budgetSummaries,
      monthlyEvolution: this.calculateMonthlyEvolution(
        transactions
      )
    };
  }

  // Evolução financeira dos últimos seis meses.
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

  // Define o intervalo de datas do filtro selecionado.
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
