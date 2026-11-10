
export interface ReportTransaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  dueDate: string;
  paymentDate: string | null;
  status: 'pending' | 'paid' | 'cancelled';
}

export interface ReportCategory {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

export interface ReportAccount {
  id: string;
  userId: string;
  name: string;
  type: string;
  initialBalance: number;
  active: boolean;
}

export interface ReportBudget {
  id: string;
  userId: string;
  categoryId: string;
  month: string;
  limit: number;
}

export interface MonthlyReport {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface CategoryReport {
  categoryId: string;
  categoryName: string;
  color: string;
  total: number;
  percentage: number;
}

export interface BudgetReport {
  categoryId: string;
  categoryName: string;
  color: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export interface ReportsData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingIncome: number;
  pendingExpenses: number;
  monthlyEvolution: MonthlyReport[];
  expensesByCategory: CategoryReport[];
  incomeByCategory: CategoryReport[];
  budgets: BudgetReport[];
  accounts: ReportAccount[];
  transactions: ReportTransaction[];
}
