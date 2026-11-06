
export type TransactionType = 'income' | 'expense';

export type TransactionStatus =
  | 'pending'
  | 'paid'
  | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'checking' | 'savings' | 'cash' | 'credit';
  initialBalance: number;
  currency: 'BRL';
  color: string;
  active: boolean;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

export interface Transaction {
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
  notes?: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  month: string;
  limit: number;
}

export interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  status: 'active' | 'completed' | 'cancelled';
}
