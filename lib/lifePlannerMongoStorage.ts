/**
 * Life Planner Storage - MongoDB Backend
 * Replaces localStorage with persistent MongoDB storage
 */

import { Reminder, Vision, Goal, Task, Todo, Word, HealthRoutine, DiamondPerson, ProgressReport, ActionPlan, DailyHealthPlan } from '@/lib/types/lifePlanner';
import { clearSession, getSession } from '@/lib/sessionManager';

class LifePlannerMongoStorage {
  private getEmail(): string | null {
    if (typeof window === 'undefined') return null;
    const userSession = localStorage.getItem('lifePlannerUser');
    if (!userSession) return null;
    try {
      const parsed = JSON.parse(userSession);
      const email = typeof parsed?.email === 'string' ? parsed.email : null;
      return email;
    } catch {
      return null;
    }
  }

  private getEmailFallback(): string | null {
    if (typeof window === 'undefined') return null;

    // Prefer unified sessionManager if available.
    const session = getSession();
    if (session?.user?.email) return session.user.email;

    // Fallback: raw localStorage key used across the app.
    const userRaw = localStorage.getItem('user');
    if (!userRaw) return null;
    try {
      const user = JSON.parse(userRaw);
      return typeof user?.email === 'string' ? user.email : null;
    } catch {
      return null;
    }
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('lifePlannerToken') || localStorage.getItem('token') || getSession()?.token || null;
  }

  private hasAuth(): boolean {
    return Boolean(this.getToken());
  }

  private authHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private handleUnauthorized(): void {
    if (typeof window === 'undefined') return;
    // 401 means the token is invalid/expired. Clear the session fully so UI re-auths cleanly.
    clearSession();
  }

  async getVisions(): Promise<Vision[]> {
    if (!this.hasAuth()) return [];
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
    if (!this.hasAuth()) return [];
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
    if (!this.hasAuth()) return;
    try {
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'actionPlans', data: actionPlans }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return;
      }
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error('[LifePlannerMongoStorage] saveActionPlans failed', { status: response.status, body });
      }
    } catch {
      console.error('Failed to save action plans');
    }
  }

  async saveVisions(visions: Vision[]): Promise<void> {
    if (!this.hasAuth()) return;
    try {
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'visions', data: visions }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return;
      }
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error('[LifePlannerMongoStorage] saveVisions failed', { status: response.status, body });
      }
    } catch {
      console.error('Failed to save visions');
    }
  }

  async getGoals(): Promise<Goal[]> {
    if (!this.hasAuth()) return [];
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
    if (!this.hasAuth()) return;
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
    if (!this.hasAuth()) return [];
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
    if (!this.hasAuth()) return;
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
    if (!this.hasAuth()) return [];
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
    if (!this.hasAuth()) return;
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
    if (!this.hasAuth()) return [];
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
    if (!this.hasAuth()) return;
    try {
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'words', data: words }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return;
      }
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error('[LifePlannerMongoStorage] saveWords failed', { status: response.status, body });
      }
    } catch {
      console.error('Failed to save words');
    }
  }

  async getReminders(): Promise<Reminder[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/life-planner/data?type=reminders`, {
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return [];
      }
      if (!response.ok) {
        console.error(`Failed to fetch reminders: ${response.status}`);
        return [];
      }
      const result = await response.json();
      // Ensure we always return an array
      const data = result.data || result.reminders || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching reminders:', error);
      return [];
    }
  }

  async saveReminders(reminders: Reminder[]): Promise<void> {
    if (!this.hasAuth()) return;
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
    if (!this.hasAuth()) return [];
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
    if (!this.hasAuth()) return;
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

  async getDailyHealthPlans(): Promise<DailyHealthPlan[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/life-planner/data?type=dailyHealthPlans`, {
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

  async saveDailyHealthPlans(plans: DailyHealthPlan[]): Promise<void> {
    if (!this.hasAuth()) return;
    try {
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'dailyHealthPlans', data: plans }),
      });
      if (response.status === 401) this.handleUnauthorized();
    } catch {
      console.error('Failed to save daily health plans');
    }
  }

  async getDiamondPeople(): Promise<DiamondPerson[]> {
    if (!this.hasAuth()) return [];
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
    if (!this.hasAuth()) return;
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
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/life-planner/data?type=progress`, {
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

  async saveProgress(progress: ProgressReport[]): Promise<void> {
    if (!this.hasAuth()) return;
    try {
      const response = await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ type: 'progress', data: progress }),
      });
      if (response.status === 401) this.handleUnauthorized();
    } catch {
      console.error('Failed to save progress');
    }
  }

  /**
   * Get workshop tasks and sadhana for a specific date
   */
  async getDailyTasks(date: string): Promise<{ workshopTasks: any[]; sadhana: any; date: string } | null> {
    if (!this.hasAuth()) return null;
    try {
      const response = await fetch(`/api/life-planner/daily-tasks?date=${date}&type=all`, {
        method: 'GET',
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return null;
      }
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.error('Failed to fetch daily tasks:', error);
      return null;
    }
  }

  /**
   * Get workshop tasks for a specific date
   */
  async getWorkshopTasks(date: string): Promise<any[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/life-planner/daily-tasks?date=${date}&type=workshopTasks`, {
        method: 'GET',
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return [];
      }
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Failed to fetch workshop tasks:', error);
      return [];
    }
  }

  /**
   * Get sadhana for a specific date
   */
  async getSadhana(date: string): Promise<any | null> {
    if (!this.hasAuth()) return null;
    try {
      const response = await fetch(`/api/life-planner/daily-tasks?date=${date}&type=sadhana`, {
        method: 'GET',
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return null;
      }
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.error('Failed to fetch sadhana:', error);
      return null;
    }
  }

  /**
   * Save workshop tasks and/or sadhana for a specific date
   */
  async saveDailyTasks(date: string, workshopTasks?: any[], sadhana?: any): Promise<void> {
    if (!this.hasAuth()) return;
    try {
      const response = await fetch('/api/life-planner/daily-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ date, workshopTasks, sadhana }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        throw new Error('Unauthorized');
      }
      if (!response.ok) {
        throw new Error(`Failed to save daily tasks: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error saving daily tasks:', error);
      throw error;
    }
  }

  /**
   * Save workshop tasks for a specific date
   */
  async saveWorkshopTasks(date: string, workshopTasks: any[]): Promise<void> {
    await this.saveDailyTasks(date, workshopTasks, undefined);
  }

  /**
   * Save sadhana for a specific date
   */
  async saveSadhana(date: string, sadhana: any): Promise<void> {
    await this.saveDailyTasks(date, undefined, sadhana);
  }
}

export const lifePlannerStorage = new LifePlannerMongoStorage();
