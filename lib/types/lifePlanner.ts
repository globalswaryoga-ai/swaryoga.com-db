// Vision Category Type
export type VisionCategory = 'Life' | 'Health' | 'Wealth' | 'Success' | 'Respect' | 'Pleasure' | 'Prosperity' | 'Luxurious' | 'Good Habits' | 'Sadhana';

// Export array of vision categories for UI
export const VISION_CATEGORIES: VisionCategory[] = [
  'Life', 'Health', 'Wealth', 'Success', 'Respect', 'Pleasure', 'Prosperity', 'Luxurious', 'Good Habits', 'Sadhana'
];

export interface Vision {
  id: string;
  title: string;
  category: VisionCategory;
  description?: string;
  imageUrl?: string;
  // Legacy/back-compat: some components store a derived category image URL separately
  categoryImageUrl?: string;
  // Extended fields used by dashboard vision form
  priority?: 'low' | 'medium' | 'high';
  status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  // Some screens store/computed a summary progress percentage
  progress?: number;
  startDate?: string;
  endDate?: string;
  time?: string;
  place?: string;
  budget?: number;
  milestones?: Milestone[];
  reminders?: Reminder[];
  goals?: Goal[];
  tasks?: Task[];
  todos?: Todo[];
  words?: Word[];
  createdAt: string;
  updatedAt: string;
}

export type MiniTodo = {
  id: string;
  title: string;
  dueDate?: string;
  dueTime?: string;
  completed: boolean;
};

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  place?: string;
  status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  createdAt: string;
  updatedAt: string;
}

export interface ActionPlanGoal {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  workingTimeStart?: string;
  workingTimeEnd?: string;
  place?: string;
  expectedAmount?: number;
  status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  priority?: 'low' | 'medium' | 'high';
  progress?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActionPlan {
  id: string;
  title: string;
  visionId: string;
  goal?: string;
  description?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  place?: string;
  expectedAmount?: number;
  milestones?: Milestone[];
  goals?: ActionPlanGoal[];
  todos?: MiniTodo[];
  status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  progress?: number;
  actionItems?: Array<{ id: string; title: string; completed: boolean }>;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  visionId: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  startDate?: string;
  targetDate?: string;
  budget?: number;
  progress?: number;
  imageUrl?: string;
  milestones?: Array<{
    id: string;
    title: string;
    dueDate: string;
    completed: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  // Linkage (optional)
  visionId?: string;
  goalId?: string;
  // Optional metadata used in some dashboards
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  // Back-compat + UI usage
  reminderType?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDueDate?: string;
  time?: string;
  startDate?: string;
  dueDate?: string;
  dueTime?: string;
  budget?: number;
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  // Whether the reminder is enabled/active (used by some UIs)
  active?: boolean;
  completed: boolean;
  completedAt?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Word {
  id: string;
  title: string;
  description?: string;
  // Legacy/alternate field name used in some dashboards
  content?: string;
  // optional legacy field (still used in filters)
  type?: 'affirmation' | 'mantra' | 'quote' | 'motivation';
  // Vision Head
  category?: VisionCategory | string;
  imageUrl?: string;
  // UI accent color used in some pages
  color?: string;
  startDate?: string;
  endDate?: string;
  timeStart?: string;
  timeEnd?: string;
  priority?: 'low' | 'medium' | 'high';
  // Optional status used by dashboards (Done / Active)
  status?: 'active' | 'completed' | 'on-hold';
  // Repeat / Frequency (expanded)
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customDays?: number;
  todos?: MiniTodo[];
  createdAt: string;
  updatedAt: string;
}

export interface HealthRoutine {
  id: string;
  title: string;
  description?: string;
  // Category/type (both used in different parts of the app)
  category?: 'exercise' | 'meditation' | 'nutrition' | 'sleep' | 'other' | string;
  type?: 'yoga' | 'meditation' | 'exercise' | 'diet' | 'sleep' | 'other';
  frequency: 'daily' | 'weekly' | 'monthly';
  duration?: number;
  daysOfWeek?: string[];
  startDate?: string;
  endDate?: string;
  // Habit tracking
  completedDates: string[];
  streak: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiamondPerson {
  id: string;
  name: string;
  // Relationship metadata
  relationship: 'professional' | 'personal' | 'family' | 'friend' | string;
  category?: string;

  // Contact details (expanded)
  mobile?: string;
  email?: string;
  address?: string;
  country?: string;
  state?: string;
  profession?: string;

  // Legacy / optional fields
  description?: string;
  contact?: string;
  lastContact?: string;
  notes?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionItem {
  id: string;
  title: string;
  visionId?: string;
  goalId?: string;
  visionHead?: VisionCategory;
  imageUrl?: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  startDate: string;
  targetDate: string;
  budget?: number;
  priority: 'low' | 'medium' | 'high';
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  taskId?: string;
  startDate: string;
  dueDate: string;
  budget?: number;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  visionHead?: VisionCategory;
  visionId?: string;
  goalId?: string;
  imageUrl?: string;
  timeStart?: string;
  timeEnd?: string;
  place?: string;
  todos?: MiniTodo[];
  startDate: string;
  dueDate: string;
  budget?: number;
  priority: 'low' | 'medium' | 'high';
  status: 'not-started' | 'in-progress' | 'pending' | 'completed' | 'overdue';
  repeat?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFormState {
  title: string;
  description: string;
  visionHead: string;
  visionId: string;
  goalId: string;
  startDate: string;
  dueDate: string;
  timeStart: string;
  timeEnd: string;
  place: string;
  imageUrl: string;
  todos: MiniTodo[];
}

// Back-compat: some storage layers persist a separate progress report collection.
// The app currently derives progress stats on the fly, so keep this intentionally flexible.
export interface ProgressReport {
  id: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | string;
  date?: string;
  title?: string;
  metrics?: Record<string, number>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
