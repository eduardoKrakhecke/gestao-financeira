export type GoalStatus = 'active' | 'completed' | 'overdue';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  status: 'active' | 'completed';
}

export interface GoalSummary extends Goal {
  percentage: number;
  remaining: number;
  calculatedStatus: GoalStatus;
}

export type GoalCreate = Omit<Goal, 'id' | 'userId' | 'status'>;

export type GoalUpdate = Partial<GoalCreate>;
