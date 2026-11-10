export type AccountType =
  | 'checking'
  | 'cash'
  | 'savings'
  | 'credit';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currency: string;
  color: string;
  active: boolean;
}

export interface AccountTransaction {
  id: string;
  userId: string;
  accountId: string;
  type: 'income' | 'expense';
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
}

export interface AccountTransfer {
  id: string;
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description: string;
}

export interface AccountSummary extends Account {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  totalTransfersIn: number;
  totalTransfersOut: number;
}

export type AccountCreate = Omit<Account,
  'id' | 'userId' | 'active'
>;

export type AccountUpdate = Partial<AccountCreate>;
