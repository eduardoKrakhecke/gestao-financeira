export interface Transfer {
  id: string;
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description: string;
}

export interface TransferCreate {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description: string;
}

export type TransferUpdate = Partial<TransferCreate>;

export interface TransferSummary extends Transfer {
  fromAccountName: string;
  toAccountName: string;
}
