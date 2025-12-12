// Vision Categories/Heads
export const VISION_CATEGORIES = [
  'Life',
  'Health',
  'Wealth',
  'Success',
  'Respect',
  'Pleasure',
  'Prosperity',
  'Luxurious',
  'Good Habits',
  'Sadhana'
] as const;

export type VisionCategory = typeof VISION_CATEGORIES[number];

// Life Planner Data Models
export interface Vision {
  id: string;
  title: string;
  description: string;
  imageUrl?: string; // Custom image URL (editable)
  categoryImageUrl?: string; // Default category image URL (auto-populated from category, editable)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  time?: string; // HH:MM
  place?: string;
  budget?: number;
  category: VisionCategory; // Must be one of the defined heads
  priority?: 'low' | 'medium' | 'high'; // Overall priority
  status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  milestones: Milestone[];
  goals: Goal[];
  tasks: Task[];
  todos: Todo[];
  words: Word[]; // Mantras, affirmations, commitments
  reminders: Reminder[]; // Notification reminders
  progress?: number; // 0-100 overall progress
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  title?: string; // Optional milestone title
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  workingHoursStart: string; // HH:MM
  workingHoursEnd: string; // HH:MM
  place: string; // Working location/place name
  status?: 'not-started' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// ActionPlan is a breakdown of a Vision into actionable milestones and goals
export interface ActionPlan {
  id: string;
  visionId: string; // Parent vision
  title: string;
  description: string;
  imageUrl?: string; // Vision's image
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  workingHoursStart: string; // HH:MM
  workingHoursEnd: string; // HH:MM
  place: string; // Primary working location
  expectedAmount?: number; // Budget/expected cost
  milestones: Milestone[]; // 1st milestone, 2nd, etc.
  goals: ActionPlanGoal[]; // Goals to achieve for this action plan
  status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  progress?: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

// Goal specifically within an ActionPlan context
export interface ActionPlanGoal {
  id: string;
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  workingTimeStart: string; // HH:MM
  workingTimeEnd: string; // HH:MM
  place: string; // Location for this goal
  expectedAmount?: number; // Budget
  status: 'not-started' | 'working' | 'pending' | 'done';
  priority?: 'low' | 'medium' | 'high';
  progress?: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  visionId?: string; // Optional parent vision
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
  budget?: number; // Amount (optional)
  priority: 'low' | 'medium' | 'high';
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  goalId?: string; // Optional parent goal
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  budget?: number; // Amount (optional)
  priority: 'low' | 'medium' | 'high';
  status: 'not-started' | 'in-progress' | 'pending' | 'completed' | 'overdue';
  repeat?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  taskId?: string; // Optional parent task
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  budget?: number; // Amount (optional)
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Word {
  id: string;
  title: string;
  content: string; // Rich text / commitment / rule
  category: string; // 'Commitment', 'Rule', 'Mantra', 'Affirmation'
  color?: string; // Hex color
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  visionId?: string; // Optional parent vision
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  budget?: number; // Amount (optional)
  category: 'life' | 'health' | 'wealth' | 'success' | 'respect' | 'pleasure' | 'prosperity' | 'luxuries' | 'good-habits' | 'self-sadhana';
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: 'low' | 'medium' | 'high';
  active: boolean;
  completed?: boolean; // Track if reminder has been completed
  lastShown?: string; // YYYY-MM-DD - tracks when reminder popup was shown
  createdAt: string;
  updatedAt: string;
}

export interface HealthRoutine {
  id: string;
  title: string;
  description?: string;
  category: 'exercise' | 'meditation' | 'nutrition' | 'sleep' | 'other';
  frequency: 'daily' | 'weekly' | 'custom';
  targetDays?: string[]; // ['Mon', 'Tue', etc.] for weekly
  completedDates: string[]; // YYYY-MM-DD
  streak: number; // consecutive days
  createdAt: string;
  updatedAt: string;
}

export interface DiamondPerson {
  id: string;
  name: string;
  mobile: string;
  profession: string;
  country: string;
  state: string;
  address: string;
  email: string;
  notes?: string;
  category: string; // 'Spiritual Mentor', 'Health Professional', 'Personal Development', 'Family', 'Friends'
  relationship: 'professional' | 'personal' | 'family' | 'friend';
  lastContact: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface ProgressReport {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date: string; // YYYY-MM-DD
  tasksCompleted: number;
  tasksTotal: number;
  todosCompleted: number;
  todosTotal: number;
  goalsProgress: number; // average progress percentage
  visionsMilestones: {
    visionId: string;
    milestonesCompleted: number;
    milestonesTotal: number;
  }[];
  healthRoutineStreak: {
    routineId: string;
    streak: number;
  }[];
}
