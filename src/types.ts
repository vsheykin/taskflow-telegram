export type Priority = 'high' | 'medium' | 'low';
export type Status = 'new' | 'in_progress' | 'completed' | 'cancelled';
export type Category = 'work' | 'personal' | 'health' | 'study' | 'other';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  category: Category;
  createdAt: string;
  dueDate: string | null;
  reminderDate: string | null;
  reminderSent: boolean;
  completedAt: string | null;
  tags: string[];
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  today: number;
}

export type ViewMode = 'list' | 'board' | 'stats';
export type FilterStatus = 'all' | Status;
export type FilterPriority = 'all' | Priority;
