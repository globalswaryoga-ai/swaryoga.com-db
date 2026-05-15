/**
 * CRM Planner Storage - MongoDB Backend (Separate from Life Planner)
 * Used by tenant/admin users in /admin/crm/planner
 * Completely independent from lifePlannerMongoStorage
 */

import { Reminder, Vision, Goal, Task, Todo, Word, HealthRoutine, DiamondPerson, ProgressReport, ActionPlan, DailyHealthPlan } from '@/lib/types/lifePlanner';
import { clearSession, getSession } from '@/lib/sessionManager';

class CrmPlannerMongoStorage {
  private getEmail(): string | null {
    if (typeof window === 'undefined') return null;
    const userSession = localStorage.getItem('user');
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
    const session = getSession();
    if (session?.user?.email) return session.user.email;

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
    return localStorage.getItem('token') || getSession()?.token || null;
  }

  private getTenantId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('tenantId') || null;
  }

  private hasAuth(): boolean {
    return Boolean(this.getToken());
  }

  private authHeaders(): Record<string, string> {
    const token = this.getToken();
    const tenantId = this.getTenantId();
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }

    console.debug('[CrmPlannerStorage] Headers:', {
      hasToken: !!token,
      hasTenantId: !!tenantId,
      tenantId: tenantId || 'MISSING',
    });

    return headers;
  }

  private handleUnauthorized(): void {
    if (typeof window === 'undefined') return;
    clearSession();
  }

  async getVisions(): Promise<Vision[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/crm-planner/data?type=crm_visions`, {
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
      const response = await fetch(`/api/crm-planner/data?type=crm_actionPlans`, {
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
    if (!this.hasAuth()) throw new Error('Not authenticated');
    try {
      const response = await fetch(`/api/crm-planner/data`, {
        method: 'POST',
        headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'crm_actionPlans', data: actionPlans }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
      }
      if (!response.ok) throw new Error('Failed to save action plans');
    } catch (err) {
      console.error('Error saving action plans:', err);
      throw err;
    }
  }

  async saveVisions(visions: Vision[]): Promise<void> {
    if (!this.hasAuth()) throw new Error('Not authenticated');
    try {
      const response = await fetch(`/api/crm-planner/data`, {
        method: 'POST',
        headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'crm_visions', data: visions }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
      }
      if (!response.ok) throw new Error('Failed to save visions');
    } catch (err) {
      console.error('Error saving visions:', err);
      throw err;
    }
  }

  async getGoals(): Promise<Goal[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/crm-planner/data?type=crm_goals`, {
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
    if (!this.hasAuth()) throw new Error('Not authenticated');
    try {
      const response = await fetch(`/api/crm-planner/data`, {
        method: 'POST',
        headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'crm_goals', data: goals }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
      }
      if (!response.ok) throw new Error('Failed to save goals');
    } catch (err) {
      console.error('Error saving goals:', err);
      throw err;
    }
  }

  async getTasks(): Promise<Task[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/crm-planner/data?type=crm_tasks`, {
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
    if (!this.hasAuth()) throw new Error('Not authenticated');
    try {
      const response = await fetch(`/api/crm-planner/data`, {
        method: 'POST',
        headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'crm_tasks', data: tasks }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
      }
      if (!response.ok) throw new Error('Failed to save tasks');
    } catch (err) {
      console.error('Error saving tasks:', err);
      throw err;
    }
  }

  async getTodos(): Promise<Todo[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/crm-planner/data?type=crm_todos`, {
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
    if (!this.hasAuth()) throw new Error('Not authenticated');
    try {
      const response = await fetch(`/api/crm-planner/data`, {
        method: 'POST',
        headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'crm_todos', data: todos }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
      }
      if (!response.ok) throw new Error('Failed to save todos');
    } catch (err) {
      console.error('Error saving todos:', err);
      throw err;
    }
  }

  async getWords(): Promise<Word[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/crm-planner/data?type=crm_words`, {
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
    if (!this.hasAuth()) throw new Error('Not authenticated');
    try {
      const response = await fetch(`/api/crm-planner/data`, {
        method: 'POST',
        headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'crm_words', data: words }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
      }
      if (!response.ok) throw new Error('Failed to save words');
    } catch (err) {
      console.error('Error saving words:', err);
      throw err;
    }
  }

  async getReminders(): Promise<Reminder[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/crm-planner/data?type=crm_reminders`, {
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
    if (!this.hasAuth()) throw new Error('Not authenticated');
    try {
      const response = await fetch(`/api/crm-planner/data`, {
        method: 'POST',
        headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'crm_reminders', data: reminders }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
      }
      if (!response.ok) throw new Error('Failed to save reminders');
    } catch (err) {
      console.error('Error saving reminders:', err);
      throw err;
    }
  }

  async getHealthRoutines(): Promise<HealthRoutine[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/crm-planner/data?type=crm_healthRoutines`, {
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
    if (!this.hasAuth()) throw new Error('Not authenticated');
    try {
      const response = await fetch(`/api/crm-planner/data`, {
        method: 'POST',
        headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'crm_healthRoutines', data: routines }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
      }
      if (!response.ok) throw new Error('Failed to save health routines');
    } catch (err) {
      console.error('Error saving health routines:', err);
      throw err;
    }
  }

  async getDailyHealthPlans(): Promise<DailyHealthPlan[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/crm-planner/data?type=crm_dailyHealthPlans`, {
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
    if (!this.hasAuth()) throw new Error('Not authenticated');
    try {
      const response = await fetch(`/api/crm-planner/data`, {
        method: 'POST',
        headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'crm_dailyHealthPlans', data: plans }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
      }
      if (!response.ok) throw new Error('Failed to save daily health plans');
    } catch (err) {
      console.error('Error saving daily health plans:', err);
      throw err;
    }
  }

  async getDiamondPeople(): Promise<DiamondPerson[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/crm-planner/data?type=crm_diamondPeople`, {
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
    if (!this.hasAuth()) throw new Error('Not authenticated');
    try {
      const response = await fetch(`/api/crm-planner/data`, {
        method: 'POST',
        headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'crm_diamondPeople', data: people }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
      }
      if (!response.ok) throw new Error('Failed to save diamond people');
    } catch (err) {
      console.error('Error saving diamond people:', err);
      throw err;
    }
  }

  async getProgress(): Promise<ProgressReport[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/crm-planner/data?type=crm_progress`, {
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
    if (!this.hasAuth()) throw new Error('Not authenticated');
    try {
      const response = await fetch(`/api/crm-planner/data`, {
        method: 'POST',
        headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'crm_progress', data: progress }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
      }
      if (!response.ok) throw new Error('Failed to save progress');
    } catch (err) {
      console.error('Error saving progress:', err);
      throw err;
    }
  }

  async getDailyTasks(date: string): Promise<{ workshopTasks: any[]; sadhana: any; date: string } | null> {
    if (!this.hasAuth()) return null;
    try {
      const response = await fetch(`/api/crm-planner/daily-tasks?date=${date}&type=all`, {
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

  async getWorkshopTasks(date: string): Promise<any[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch(`/api/crm-planner/daily-tasks?date=${date}&type=workshopTasks`, {
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

  async getSadhana(date: string): Promise<any | null> {
    if (!this.hasAuth()) return null;
    try {
      const response = await fetch(`/api/crm-planner/daily-tasks?date=${date}&type=sadhana`, {
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

  async saveDailyTasks(date: string, workshopTasks?: any[], sadhana?: any): Promise<void> {
    if (!this.hasAuth()) return;
    try {
      const response = await fetch('/api/crm-planner/daily-tasks', {
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

  async saveWorkshopTasks(date: string, workshopTasks: any[]): Promise<void> {
    await this.saveDailyTasks(date, workshopTasks, undefined);
  }

  async saveSadhana(date: string, sadhana: any): Promise<void> {
    await this.saveDailyTasks(date, undefined, sadhana);
  }

  async getEvents(): Promise<any[]> {
    if (!this.hasAuth()) return [];
    try {
      const response = await fetch('/api/crm-planner/events', {
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        return [];
      }
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.events) ? data.events : [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  async saveEvents(events: any[]): Promise<void> {
    if (!this.hasAuth()) return;
    try {
      const response = await fetch('/api/crm-planner/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ events }),
      });
      if (response.status === 401) {
        this.handleUnauthorized();
        throw new Error('Unauthorized');
      }
      if (!response.ok) {
        throw new Error(`Failed to save events: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error saving events:', error);
      throw error;
    }
  }
}

// Create a single instance and ensure methods are accessible
const _instance = new CrmPlannerMongoStorage();

// Export the instance
export const crmPlannerStorage = _instance;

// Debug logging
if (typeof window !== 'undefined') {
  console.debug('[CrmPlannerStorage] Instance created:', {
    isDefined: _instance !== undefined && _instance !== null,
    type: typeof _instance,
    hasGetDailyTasks: typeof _instance?.getDailyTasks === 'function',
    hasSaveSadhana: typeof _instance?.saveSadhana === 'function',
    hasGetVisions: typeof _instance?.getVisions === 'function',
    constructorName: _instance?.constructor?.name,
    methods: _instance ? Object.getOwnPropertyNames(Object.getPrototypeOf(_instance)) : [],
  });
}
