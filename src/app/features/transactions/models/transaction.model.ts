
export type TransactionType = 'income' | 'expense';

export type TransactionStatus = 'pending' | 'paid' | 'cancelled';

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
  notes: string;
}

export interface TransactionAccount {
  id: string;
  userId: string;
  name: string;
  type: string;
  active: boolean;
}

export interface TransactionCategory {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

export interface TransactionListItem extends Transaction {
  accountName: string;
  categoryName: string;
  categoryColor: string;
}

export interface TransactionCreate {
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

export type TransactionUpdate = Partial<TransactionCreate>;

export interface TransactionFilters {
  search: string;
  type: TransactionType | 'all';
  status: TransactionStatus | 'all';
  categoryId: string;
  accountId: string;
  startDate: string;
  endDate: string;
}

export type TransactionSortField =
  | 'description'
  | 'amount'
  | 'dueDate';

export type TransactionSortDirection = 'asc' | 'desc';
