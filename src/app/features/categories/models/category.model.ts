
export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
}

export type CategoryCreate = Omit<Category, 'id' | 'userId'>;

export type CategoryUpdate = Partial<CategoryCreate>;

export interface CategoryUsage {
  transactions: number;
  budgets: number;
  total: number;
}
