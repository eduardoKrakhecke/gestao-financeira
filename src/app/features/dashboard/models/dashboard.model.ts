export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'paid' | 'cancelled';

export interface DashboardAccount {
  id: string;
  userId: string;
  name: string;
  type: string;
  initialBalance: number;
  currency: string;
  color: string;
  active: boolean;
}

export interface DashboardCategory {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

export interface DashboardTransaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string;
  description: string;
  type: TransactionType;
  amount: number;
  dueDate: string;
  paymentDate: string | null;
  status: TransactionStatus;
  notes: string;
}

export interface DashboardBudget {
  id: string;
  userId: string;
  categoryId: string;
  month: string;
  limit: number;
}

export interface DashboardCategorySummary {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  percentage: number;
}

export interface DashboardAccountSummary {
  id: string;
  name: string;
  color: string;
  balance: number;
}

export interface DashboardSummary {
  totalBalance: number;
  projectedBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  pendingIncome: number;
  pendingExpenses: number;
  accounts: DashboardAccountSummary[];
  categories: DashboardCategorySummary[];
  recentTransactions: DashboardTransaction[];
  budgets: DashboardBudgetSummary[];
  monthlyEvolution: MonthlyEvolution[];
}

export interface MonthlyEvolution {
  month: string;
  income: number;
  expenses: number;
}

export type DashboardPeriod =
  | 'current-month'
  | 'last-3-months'
  | 'last-6-months'
  | 'current-year';

export interface DashboardBudgetSummary {
  id: string;
  categoryId: string;
  categoryName: string;
  color: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'normal' | 'warning' | 'exceeded';
}
