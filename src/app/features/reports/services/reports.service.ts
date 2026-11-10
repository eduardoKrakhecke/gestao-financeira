
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth.service';

import {
  BudgetReport,
  CategoryReport,
  MonthlyReport,
  ReportAccount,
  ReportBudget,
  ReportCategory,
  ReportTransaction,
  ReportsData
} from '../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  getReportData(startDate: string, endDate: string): Observable<ReportsData> {
    const userId = this.auth.currentUser()?.id;

    if (!userId) {
      throw new Error('Usuário não autenticado.');
    }

    return forkJoin({
      transactions: this.api.get<ReportTransaction[]>(
        `/transactions?userId=${userId}`
      ),
      categories: this.api.get<ReportCategory[]>(
        `/categories?userId=${userId}`
      ),
      accounts: this.api.get<ReportAccount[]>(
        `/accounts?userId=${userId}`
      ),
      budgets: this.api.get<ReportBudget[]>(
        `/budgets?userId=${userId}`
      )
    }).pipe(
      map(({ transactions, categories, accounts, budgets }) => {
        const periodTransactions = transactions.filter(transaction => {
          const date = transaction.paymentDate || transaction.dueDate;

          return (
            transaction.status !== 'cancelled' &&
            date >= startDate &&
            date <= endDate
          );
        });

        const paidTransactions = periodTransactions.filter(
          transaction => transaction.status === 'paid'
        );

        const income = paidTransactions.filter(
          transaction => transaction.type === 'income'
        );

        const expenses = paidTransactions.filter(
          transaction => transaction.type === 'expense'
        );

        const pendingIncome = periodTransactions
          .filter(
            transaction =>
              transaction.status === 'pending' &&
              transaction.type === 'income'
          )
          .reduce((total, transaction) => total + transaction.amount, 0);

        const pendingExpenses = periodTransactions
          .filter(
            transaction =>
              transaction.status === 'pending' &&
              transaction.type === 'expense'
          )
          .reduce((total, transaction) => total + transaction.amount, 0);

        const totalIncome = this.sumAmounts(income);
        const totalExpenses = this.sumAmounts(expenses);

        return {
          totalIncome,
          totalExpenses,
          balance: totalIncome - totalExpenses,
          pendingIncome,
          pendingExpenses,
          monthlyEvolution: this.getMonthlyEvolution(
            paidTransactions,
            startDate,
            endDate
          ),
          expensesByCategory: this.getCategoryReport(
            expenses,
            categories.filter(category => category.type === 'expense')
          ),
          incomeByCategory: this.getCategoryReport(
            income,
            categories.filter(category => category.type === 'income')
          ),
          budgets: this.getBudgetReport(
            budgets,
            categories,
            transactions,
            startDate,
            endDate
          ),
          accounts: accounts.filter(account => account.active),
          transactions: periodTransactions
        };
      })
    );
  }

  private sumAmounts(transactions: ReportTransaction[]): number {
    return transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0
    );
  }

  private getCategoryReport(
    transactions: ReportTransaction[],
    categories: ReportCategory[]
  ): CategoryReport[] {
    const totals = new Map<string, number>();

    transactions.forEach(transaction => {
      const current = totals.get(transaction.categoryId) || 0;
      totals.set(
        transaction.categoryId,
        current + transaction.amount
      );
    });

    const total = Array.from(totals.values()).reduce(
      (sum, value) => sum + value,
      0
    );

    return Array.from(totals.entries())
      .map(([categoryId, amount]) => {
        const category = categories.find(item => item.id === categoryId);

        return {
          categoryId,
          categoryName: category?.name || 'Sem categoria',
          color: category?.color || '#94a3b8',
          total: amount,
          percentage: total > 0 ? (amount / total) * 100 : 0
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  private getMonthlyEvolution(
    transactions: ReportTransaction[],
    startDate: string,
    endDate: string
  ): MonthlyReport[] {
    const months = new Map<string, MonthlyReport>();

    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);

    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor <= lastMonth) {
      const month = `${cursor.getFullYear()}-${String(
        cursor.getMonth() + 1
      ).padStart(2, '0')}`;

      months.set(month, {
        month,
        income: 0,
        expenses: 0,
        balance: 0
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }

    transactions.forEach(transaction => {
      if (transaction.status !== 'paid' || !transaction.paymentDate) {
        return;
      }

      const month = transaction.paymentDate.slice(0, 7);
      const report = months.get(month);

      if (!report) {
        return;
      }

      if (transaction.type === 'income') {
        report.income += transaction.amount;
      } else {
        report.expenses += transaction.amount;
      }

      report.balance = report.income - report.expenses;
    });

    return Array.from(months.values());
  }

  private getBudgetReport(
    budgets: ReportBudget[],
    categories: ReportCategory[],
    transactions: ReportTransaction[],
    startDate: string,
    endDate: string
  ): BudgetReport[] {
    return budgets
      .filter(
        budget =>
          `${budget.month}-01` <= endDate &&
          `${budget.month}-31` >= startDate
      )
      .map(budget => {
        const category = categories.find(
          item => item.id === budget.categoryId
        );

        const spent = transactions
          .filter(
            transaction =>
              transaction.categoryId === budget.categoryId &&
              transaction.type === 'expense' &&
              transaction.status === 'paid' &&
              !!transaction.paymentDate &&
              transaction.paymentDate.startsWith(budget.month)
          )
          .reduce((total, transaction) => total + transaction.amount, 0);

        return {
          categoryId: budget.categoryId,
          categoryName: category?.name || 'Categoria removida',
          color: category?.color || '#94a3b8',
          limit: budget.limit,
          spent,
          remaining: budget.limit - spent,
          percentage:
            budget.limit > 0 ? (spent / budget.limit) * 100 : 0
        };
      });
  }
}
