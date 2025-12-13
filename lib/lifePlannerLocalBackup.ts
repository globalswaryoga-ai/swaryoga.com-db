/**
 * Life Planner Local Backup
 *
 * Reads legacy Life Planner data that was previously stored in browser localStorage
 * (before MongoDB / cross-device sync was enabled).
 */

import type {
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
} as const;

export type LifePlannerLocalBackupData = {
  visions: Vision[];
  actionPlans: ActionPlan[];
  goals: Goal[];
  tasks: Task[];
  todos: Todo[];
  words: Word[];
  reminders: Reminder[];
  healthRoutines: HealthRoutine[];
  diamondPeople: DiamondPerson[];
};

function safeParse<T>(value: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function readLifePlannerLocalBackup(): LifePlannerLocalBackupData {
  if (typeof window === 'undefined') {
    return {
      visions: [],
      actionPlans: [],
      goals: [],
      tasks: [],
      todos: [],
      words: [],
      reminders: [],
      healthRoutines: [],
      diamondPeople: [],
    };
  }

  return {
    visions: safeParse<Vision>(localStorage.getItem(STORAGE_KEYS.visions)),
    actionPlans: safeParse<ActionPlan>(localStorage.getItem(STORAGE_KEYS.actionPlans)),
    goals: safeParse<Goal>(localStorage.getItem(STORAGE_KEYS.goals)),
    tasks: safeParse<Task>(localStorage.getItem(STORAGE_KEYS.tasks)),
    todos: safeParse<Todo>(localStorage.getItem(STORAGE_KEYS.todos)),
    words: safeParse<Word>(localStorage.getItem(STORAGE_KEYS.words)),
    reminders: safeParse<Reminder>(localStorage.getItem(STORAGE_KEYS.reminders)),
    healthRoutines: safeParse<HealthRoutine>(localStorage.getItem(STORAGE_KEYS.healthRoutines)),
    diamondPeople: safeParse<DiamondPerson>(localStorage.getItem(STORAGE_KEYS.diamondPeople)),
  };
}

export function clearLifePlannerLocalBackup(): void {
  if (typeof window === 'undefined') return;
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}
