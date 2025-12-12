// localStorage utility for Life Planner data persistence
import {
  Vision,
  Goal,
  Task,
  Todo,
  Word,
  Reminder,
  HealthRoutine,
  DiamondPerson,
  ActionPlan,
} from '@/lib/types/lifePlanner';

// Unified storage keys - using consistent naming
const STORAGE_KEYS = {
  visions: 'swar-life-planner-visions',
  actionPlans: 'swar-life-planner-action-plans',
  goals: 'swar-life-planner-goals',
  tasks: 'swar-life-planner-tasks',
  todos: 'swar-life-planner-todos',
  words: 'swar-life-planner-words',
  reminders: 'swar-life-planner-reminders',
  healthRoutines: 'swar-life-planner-health-routines',
  diamondPeople: 'swar-life-planner-diamond-people',
};

export const lifePlannerStorage = {
  // Visions
  getVisions: (): Vision[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.visions);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveVisions: (visions: Vision[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.visions, JSON.stringify(visions));
  },

  // Action Plans
  getActionPlans: (): ActionPlan[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.actionPlans);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveActionPlans: (actionPlans: ActionPlan[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.actionPlans, JSON.stringify(actionPlans));
  },

  // Goals
  getGoals: (): Goal[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.goals);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveGoals: (goals: Goal[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
  },

  // Tasks
  getTasks: (): Task[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.tasks);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveTasks: (tasks: Task[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  },

  // Todos
  getTodos: (): Todo[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.todos);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveTodos: (todos: Todo[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(todos));
  },

  // Words
  getWords: (): Word[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.words);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveWords: (words: Word[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.words, JSON.stringify(words));
  },

  // Reminders
  getReminders: (): Reminder[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.reminders);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveReminders: (reminders: Reminder[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(reminders));
  },

  // Health Routines
  getHealthRoutines: (): HealthRoutine[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.healthRoutines);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveHealthRoutines: (routines: HealthRoutine[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.healthRoutines, JSON.stringify(routines));
  },

  // Diamond People
  getDiamondPeople: (): DiamondPerson[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.diamondPeople);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveDiamondPeople: (people: DiamondPerson[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.diamondPeople, JSON.stringify(people));
  },

  // Clear all data
  clearAll: () => {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },
};
