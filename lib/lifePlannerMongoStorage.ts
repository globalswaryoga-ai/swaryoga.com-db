/**
 * Life Planner Storage - MongoDB Backend
 * Replaces localStorage with persistent MongoDB storage
 */

import { Reminder, Vision, Goal, Task, Todo, Word, HealthRoutine, DiamondPerson, ProgressReport, ActionPlan } from '@/lib/types/lifePlanner';

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

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('lifePlannerToken');
  }

  private authHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private handleUnauthorized(): void {
    if (typeof window === 'undefined') return;
    // Clear invalid session so UI routes the user to login.
    localStorage.removeItem('lifePlannerToken');
    // Keep lifePlannerUser so the email stays prefilled/known, but auth must be renewed.
  }

  async getVisions(): Promise<Vision[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?type=visions`, {
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return [];
      }
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch {
      return [];
    }
  }

  async getActionPlans(): Promise<ActionPlan[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?type=actionPlans`, {
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return [];
      }
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch {
      return [];
    }
  }

  async saveActionPlans(actionPlans: ActionPlan[]): Promise<void> {
    const email = this.getEmail();
    if (!email) return;
    try {
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'actionPlans', data: actionPlans }),
      });
      if (response.status === 401) this.handleUnauthorized();
    } catch {
      console.error('Failed to save action plans');
    }
  }

  async saveVisions(visions: Vision[]): Promise<void> {
    const email = this.getEmail();
    if (!email) return;
    try {
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'visions', data: visions }),
      });
      if (response.status === 401) this.handleUnauthorized();
    } catch {
      console.error('Failed to save visions');
    }
  }

  async getGoals(): Promise<Goal[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?type=goals`, {
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return [];
      }
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
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'goals', data: goals }),
      });
      if (response.status === 401) this.handleUnauthorized();
    } catch {
      console.error('Failed to save goals');
    }
  }

  async getTasks(): Promise<Task[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?type=tasks`, {
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return [];
      }
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
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'tasks', data: tasks }),
      });
      if (response.status === 401) this.handleUnauthorized();
    } catch {
      console.error('Failed to save tasks');
    }
  }

  async getTodos(): Promise<Todo[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?type=todos`, {
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return [];
      }
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
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'todos', data: todos }),
      });
      if (response.status === 401) this.handleUnauthorized();
    } catch {
      console.error('Failed to save todos');
    }
  }

  async getWords(): Promise<Word[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?type=words`, {
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return [];
      }
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
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'words', data: words }),
      });
      if (response.status === 401) this.handleUnauthorized();
    } catch {
      console.error('Failed to save words');
    }
  }

  async getReminders(): Promise<Reminder[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?type=reminders`, {
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return [];
      }
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
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'reminders', data: reminders }),
      });
      if (response.status === 401) this.handleUnauthorized();
    } catch {
      console.error('Failed to save reminders');
    }
  }

  async getHealthRoutines(): Promise<HealthRoutine[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?type=healthRoutines`, {
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return [];
      }
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
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'healthRoutines', data: routines }),
      });
      if (response.status === 401) this.handleUnauthorized();
    } catch {
      console.error('Failed to save health routines');
    }
  }

  async getDiamondPeople(): Promise<DiamondPerson[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?type=diamondPeople`, {
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return [];
      }
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
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'diamondPeople', data: people }),
      });
      if (response.status === 401) this.handleUnauthorized();
    } catch {
      console.error('Failed to save diamond people');
    }
  }

  async getProgress(): Promise<ProgressReport[]> {
    const email = this.getEmail();
    if (!email) return [];
    try {
      const response = await fetch(`/api/life-planner/data?type=progress`, {
        headers: this.authHeaders(),
      });
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
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'progress', data: progress }),
      });
    } catch {
      console.error('Failed to save progress');
    }
  }
}

export const lifePlannerStorage = new LifePlannerMongoStorage();
