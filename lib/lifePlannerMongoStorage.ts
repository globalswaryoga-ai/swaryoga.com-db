/**
 * Life Planner Storage - MongoDB Backend
 * Replaces localStorage with persistent MongoDB storage
 */

import { Reminder, Vision, Goal, Task, Todo, Word, HealthRoutine, DiamondPerson, ProgressReport } from '@/lib/types/lifePlanner';

class LifePlannerMongoStorage {
  private getEmail(): string | null {
    if (typeof window === 'undefined') return null;
    const userSession = localStorage.getItem('lifePlannerUser');
    if (!userSession) return null;
    try {
      const { email } = JSON.parse(userSession);
      return email;
    } catch {
      return null;
    }
  }

  async getVisions(): Promise<Vision[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?email=${encodeURIComponent(email)}&type=visions`);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch {
      return [];
    }
  }

  async saveVisions(visions: Vision[]): Promise<void> {
    const email = this.getEmail();
    if (!email) return;
    try {
      await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'visions', data: visions }),
      });
    } catch {
      console.error('Failed to save visions');
    }
  }

  async getGoals(): Promise<Goal[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?email=${encodeURIComponent(email)}&type=goals`);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch {
      return [];
    }
  }

  async saveGoals(goals: Goal[]): Promise<void> {
    const email = this.getEmail();
    if (!email) return;
    try {
      await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'goals', data: goals }),
      });
    } catch {
      console.error('Failed to save goals');
    }
  }

  async getTasks(): Promise<Task[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?email=${encodeURIComponent(email)}&type=tasks`);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch {
      return [];
    }
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    const email = this.getEmail();
    if (!email) return;
    try {
      await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'tasks', data: tasks }),
      });
    } catch {
      console.error('Failed to save tasks');
    }
  }

  async getTodos(): Promise<Todo[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?email=${encodeURIComponent(email)}&type=todos`);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch {
      return [];
    }
  }

  async saveTodos(todos: Todo[]): Promise<void> {
    const email = this.getEmail();
    if (!email) return;
    try {
      await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'todos', data: todos }),
      });
    } catch {
      console.error('Failed to save todos');
    }
  }

  async getWords(): Promise<Word[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?email=${encodeURIComponent(email)}&type=words`);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch {
      return [];
    }
  }

  async saveWords(words: Word[]): Promise<void> {
    const email = this.getEmail();
    if (!email) return;
    try {
      await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'words', data: words }),
      });
    } catch {
      console.error('Failed to save words');
    }
  }

  async getReminders(): Promise<Reminder[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?email=${encodeURIComponent(email)}&type=reminders`);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch {
      return [];
    }
  }

  async saveReminders(reminders: Reminder[]): Promise<void> {
    const email = this.getEmail();
    if (!email) return;
    try {
      await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'reminders', data: reminders }),
      });
    } catch {
      console.error('Failed to save reminders');
    }
  }

  async getHealthRoutines(): Promise<HealthRoutine[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?email=${encodeURIComponent(email)}&type=healthRoutines`);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch {
      return [];
    }
  }

  async saveHealthRoutines(routines: HealthRoutine[]): Promise<void> {
    const email = this.getEmail();
    if (!email) return;
    try {
      await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'healthRoutines', data: routines }),
      });
    } catch {
      console.error('Failed to save health routines');
    }
  }

  async getDiamondPeople(): Promise<DiamondPerson[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?email=${encodeURIComponent(email)}&type=diamondPeople`);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch {
      return [];
    }
  }

  async saveDiamondPeople(people: DiamondPerson[]): Promise<void> {
    const email = this.getEmail();
    if (!email) return;
    try {
      await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'diamondPeople', data: people }),
      });
    } catch {
      console.error('Failed to save diamond people');
    }
  }

  async getProgress(): Promise<ProgressReport[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?email=${encodeURIComponent(email)}&type=progress`);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch {
      return [];
    }
  }

  async saveProgress(progress: ProgressReport[]): Promise<void> {
    const email = this.getEmail();
    if (!email) return;
    try {
      await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'progress', data: progress }),
      });
    } catch {
      console.error('Failed to save progress');
    }
  }
}

export const lifePlannerStorage = new LifePlannerMongoStorage();
