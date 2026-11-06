export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  month: string;
  limit: number;
}

export interface BudgetCategory {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

export interface BudgetTransaction {
  id: string;
  userId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: number;
  paymentDate: string | null;
  status: 'pending' | 'paid' | 'cancelled';
}

export type BudgetStatus = 'normal' | 'warning' | 'exceeded';

export interface BudgetSummary extends Budget {
  categoryName: string;
  categoryColor: string;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
}

export type BudgetCreate = Omit<Budget, 'id' | 'userId'>;

export type BudgetUpdate = Partial<BudgetCreate>;
