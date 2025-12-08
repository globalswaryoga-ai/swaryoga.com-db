// Life Planner Data Management - MongoDB Backend Integration

import axios from 'axios';

// Determine API URL based on environment
const getAPIUrl = () => {
  // Check environment variable first
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;
  
  // Check if running in development or production
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isDev) {
    return 'http://localhost:4000/api'; // Local development - backend on port 4000
  } else {
    // Production - use latest Vercel backend
    return 'https://swar-yoga-latest-dogliiw3r-swar-yoga-projects.vercel.app/api'; // Production backend (updated Dec 9, 2025)
  }
};

const API_URL = getAPIUrl();

console.log(`🔗 Using API URL: ${API_URL}`);

// Create axios instance with default headers
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add user ID to all requests
apiClient.interceptors.request.use((config) => {
  try {
    // Try to get userId from localStorage directly first
    let userId = localStorage.getItem('userId');
    
    // If not found, try to extract from user object in localStorage
    if (!userId) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        userId = userObj.id || userObj._id;
      }
    }
    
    if (userId) {
      config.headers['X-User-ID'] = userId;
      console.log(`📤 API Request with User ID: ${userId}`);
    } else {
      console.warn('⚠️ No user ID found in localStorage for API request');
    }
  } catch (error) {
    console.error('❌ Error getting user ID:', error);
  }
  return config;
});

// Add response error interceptor with retry logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('API Error:', error.message, error.response?.status);
    
    // If network error, try localhost as fallback
    if (!error.response && error.message.includes('Network')) {
      console.warn('⚠️ Network error detected, retrying with localhost...');
      try {
        const fallbackUrl = 'http://localhost:4000/api';
        const fallbackClient = axios.create({
          baseURL: fallbackUrl,
          headers: apiClient.defaults.headers
        });
        
        // Copy the original request config to fallback client
        const config = error.config;
        const response = await fallbackClient.request(config);
        return response;
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

// ============ TYPE DEFINITIONS ============

export interface Vision {
  _id?: string;
  id?: string;
  userId: string;
  title: string;
  description: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'Active' | 'Completed' | 'On Hold' | 'Not Started' | 'In Progress';
  imageUrl?: string;
  timelineMonths?: number;
  startDate?: string;
  targetDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Goal {
  _id?: string;
  id?: string;
  userId: string;
  title: string;
  description: string;
  visionId?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'Not Started' | 'In Progress' | 'Completed';
  progress?: number;
  targetDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Milestone {
  _id?: string;
  id?: string;
  userId: string;
  title: string;
  description: string;
  dueDate?: string;
  status?: 'Pending' | 'Completed';
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  _id?: string;
  id?: string;
  userId: string;
  title: string;
  description: string;
  priority?: 'High' | 'Medium' | 'Low';
  startDate?: string;
  dueDate?: string;
  recurrence?: 'Once' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  status?: 'Pending' | 'In Progress' | 'Completed';
  isOverdue?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MyWord {
  _id?: string;
  id?: string;
  userId: string;
  commitment: string;
  committedDate?: string;
  completionDeadline?: string;
  recurrence?: 'Once' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  status?: 'Pending' | 'In Progress' | 'Completed';
  isOverdue?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Todo {
  _id?: string;
  id?: string;
  userId: string;
  title: string;
  description?: string;
  completed?: boolean;
  status?: 'Pending' | 'Completed';
  priority?: 'High' | 'Medium' | 'Low';
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Reminder {
  _id?: string;
  id?: string;
  userId: string;
  title: string;
  description?: string;
  reminderDate?: string;
  reminderTime: string;
  status?: 'Active' | 'Pending' | 'Sent' | 'Dismissed';
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyPlan {
  _id?: string;
  id?: string;
  userId: string;
  date: string;
  morning?: string;
  afternoon?: string;
  evening?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HealthTracker {
  _id?: string;
  id?: string;
  userId: string;
  date: string;
  weight?: number;
  bloodPressure?: string;
  sleepHours?: number;
  mood?: string;
  energyLevel?: number;
  hydration?: number;
  steps?: number;
  water?: number;
  sleep?: number;
  exercise?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============ UTILITY FUNCTIONS ============

export const isOverdue = (dueDate: string | undefined): boolean => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
};

export const daysUntilDue = (dueDate: string | undefined): number => {
  if (!dueDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const formatDate = (date: string): string => {
  const d = new Date(date);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

// ============ API FUNCTIONS ============

// VISIONS API
export const visionAPI = {
  getAll: async (userId: string): Promise<Vision[]> => {
    try {
      console.log(`📥 Fetching visions for user: ${userId}`);
      const response = await apiClient.get('/visions', {
        headers: { 'X-User-ID': userId }
      });
      console.log(`✅ Fetched ${response.data.length} visions`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching visions:', error);
      return [];
    }
  },

  create: async (data: Vision): Promise<Vision> => {
    try {
      console.log(`📤 Creating vision:`, data);
      const response = await apiClient.post('/visions', data, {
        headers: { 'X-User-ID': data.userId }
      });
      console.log(`✅ Vision created:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating vision:', error);
      // Provide helpful error message
      if (error.response?.status === 400) {
        throw new Error('Invalid vision data. Please check all required fields.');
      } else if (error.response?.status === 401) {
        throw new Error('You are not authenticated. Please sign in again.');
      } else if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      } else if (!error.response) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      throw new Error(error.response?.data?.message || 'Failed to create vision');
    }
  },

  update: async (id: string, data: Partial<Vision>): Promise<Vision> => {
    try {
      const response = await apiClient.put(`/visions/${id}`, data, {
        headers: { 'X-User-ID': data.userId }
      });
      console.log(`✅ Vision updated:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error updating vision:', error);
      if (!error.response) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      throw new Error(error.response?.data?.message || 'Failed to update vision');
    }
  },

  delete: async (id: string, userId: string): Promise<void> => {
    try {
      await apiClient.delete(`/visions/${id}`, {
        headers: { 'X-User-ID': userId }
      });
      console.log(`✅ Vision deleted successfully`);
    } catch (error: any) {
      console.error('❌ Error deleting vision:', error);
      if (!error.response) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      throw new Error(error.response?.data?.message || 'Failed to delete vision');
    }
  }
};

// GOALS API
export const goalAPI = {
  getAll: async (userId: string): Promise<Goal[]> => {
    try {
      console.log(`📥 Fetching goals for user: ${userId}`);
      const response = await apiClient.get('/goals', {
        headers: { 'X-User-ID': userId }
      });
      console.log(`✅ Fetched ${response.data.length} goals`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching goals:', error);
      return [];
    }
  },

  create: async (data: Goal): Promise<Goal> => {
    try {
      const response = await apiClient.post('/goals', data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error creating goal:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<Goal>): Promise<Goal> => {
    try {
      const response = await apiClient.put(`/goals/${id}`, data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error updating goal:', error);
      throw error;
    }
  },

  delete: async (id: string, userId: string): Promise<void> => {
    try {
      await apiClient.delete(`/goals/${id}`, {
        headers: { 'X-User-ID': userId }
      });
    } catch (error) {
      console.error('❌ Error deleting goal:', error);
      throw error;
    }
  }
};

// TODOS API
export const todoAPI = {
  getAll: async (userId: string): Promise<Todo[]> => {
    try {
      console.log(`📥 Fetching todos for user: ${userId}`);
      const response = await apiClient.get('/todos', {
        headers: { 'X-User-ID': userId }
      });
      console.log(`✅ Fetched ${response.data.length} todos`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching todos:', error);
      return [];
    }
  },

  create: async (data: Todo): Promise<Todo> => {
    try {
      const response = await apiClient.post('/todos', data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error creating todo:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<Todo>): Promise<Todo> => {
    try {
      const response = await apiClient.put(`/todos/${id}`, data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error updating todo:', error);
      throw error;
    }
  },

  delete: async (id: string, userId: string): Promise<void> => {
    try {
      await apiClient.delete(`/todos/${id}`, {
        headers: { 'X-User-ID': userId }
      });
    } catch (error) {
      console.error('❌ Error deleting todo:', error);
      throw error;
    }
  }
};

// TASKS API
export const taskAPI = {
  getAll: async (userId: string): Promise<Task[]> => {
    try {
      console.log(`📥 Fetching tasks for user: ${userId}`);
      const response = await apiClient.get('/tasks', {
        headers: { 'X-User-ID': userId }
      });
      console.log(`✅ Fetched ${response.data.length} tasks`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      return [];
    }
  },

  create: async (data: Task): Promise<Task> => {
    try {
      const response = await apiClient.post('/tasks', data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error creating task:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<Task>): Promise<Task> => {
    try {
      const response = await apiClient.put(`/tasks/${id}`, data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error updating task:', error);
      throw error;
    }
  },

  delete: async (id: string, userId: string): Promise<void> => {
    try {
      await apiClient.delete(`/tasks/${id}`, {
        headers: { 'X-User-ID': userId }
      });
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      throw error;
    }
  }
};

// REMINDERS API
export const reminderAPI = {
  getAll: async (userId: string): Promise<Reminder[]> => {
    try {
      console.log(`📥 Fetching reminders for user: ${userId}`);
      const response = await apiClient.get('/reminders', {
        headers: { 'X-User-ID': userId }
      });
      console.log(`✅ Fetched ${response.data.length} reminders`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching reminders:', error);
      return [];
    }
  },

  create: async (data: Reminder): Promise<Reminder> => {
    try {
      const response = await apiClient.post('/reminders', data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error creating reminder:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<Reminder>): Promise<Reminder> => {
    try {
      const response = await apiClient.put(`/reminders/${id}`, data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error updating reminder:', error);
      throw error;
    }
  },

  delete: async (id: string, userId: string): Promise<void> => {
    try {
      await apiClient.delete(`/reminders/${id}`, {
        headers: { 'X-User-ID': userId }
      });
    } catch (error) {
      console.error('❌ Error deleting reminder:', error);
      throw error;
    }
  }
};

// DAILY PLANS API
export const dailyPlanAPI = {
  getByDate: async (userId: string, date: string): Promise<DailyPlan | null> => {
    try {
      console.log(`📥 Fetching daily plan for date: ${date}`);
      const response = await apiClient.get(`/dailyplans?date=${date}`, {
        headers: { 'X-User-ID': userId }
      });
      const plans = response.data || [];
      return plans.length > 0 ? plans[0] : null;
    } catch (error) {
      console.error('❌ Error fetching daily plan:', error);
      return null;
    }
  },

  getAll: async (userId: string): Promise<DailyPlan[]> => {
    try {
      const response = await apiClient.get('/dailyplans', {
        headers: { 'X-User-ID': userId }
      });
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching daily plans:', error);
      return [];
    }
  },

  create: async (data: DailyPlan): Promise<DailyPlan> => {
    try {
      const response = await apiClient.post('/dailyplans', data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error creating daily plan:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<DailyPlan>): Promise<DailyPlan> => {
    try {
      const response = await apiClient.put(`/dailyplans/${id}`, data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error updating daily plan:', error);
      throw error;
    }
  },

  delete: async (id: string, userId: string): Promise<void> => {
    try {
      await apiClient.delete(`/dailyplans/${id}`, {
        headers: { 'X-User-ID': userId }
      });
    } catch (error) {
      console.error('❌ Error deleting daily plan:', error);
      throw error;
    }
  }
};

// HEALTH TRACKER API
export const healthTrackerAPI = {
  getByDate: async (userId: string, date: string): Promise<HealthTracker | null> => {
    try {
      console.log(`📥 Fetching health data for date: ${date}`);
      const response = await apiClient.get(`/health?date=${date}`, {
        headers: { 'X-User-ID': userId }
      });
      const records = response.data || [];
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error('❌ Error fetching health data:', error);
      return null;
    }
  },

  getAll: async (userId: string): Promise<HealthTracker[]> => {
    try {
      const response = await apiClient.get('/health', {
        headers: { 'X-User-ID': userId }
      });
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching health data:', error);
      return [];
    }
  },

  create: async (data: HealthTracker): Promise<HealthTracker> => {
    try {
      const response = await apiClient.post('/health', data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error creating health record:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<HealthTracker>): Promise<HealthTracker> => {
    try {
      const response = await apiClient.put(`/health/${id}`, data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error updating health record:', error);
      throw error;
    }
  },

  delete: async (id: string, userId: string): Promise<void> => {
    try {
      await apiClient.delete(`/health/${id}`, {
        headers: { 'X-User-ID': userId }
      });
    } catch (error) {
      console.error('❌ Error deleting health record:', error);
      throw error;
    }
  }
};

// MILESTONES API
export const milestoneAPI = {
  getAll: async (userId: string): Promise<Milestone[]> => {
    try {
      const response = await apiClient.get('/milestones', {
        headers: { 'X-User-ID': userId }
      });
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching milestones:', error);
      return [];
    }
  },

  create: async (data: Milestone): Promise<Milestone> => {
    try {
      const response = await apiClient.post('/milestones', data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error creating milestone:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<Milestone>): Promise<Milestone> => {
    try {
      const response = await apiClient.put(`/milestones/${id}`, data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error updating milestone:', error);
      throw error;
    }
  },

  delete: async (id: string, userId: string): Promise<void> => {
    try {
      await apiClient.delete(`/milestones/${id}`, {
        headers: { 'X-User-ID': userId }
      });
    } catch (error) {
      console.error('❌ Error deleting milestone:', error);
      throw error;
    }
  }
};

// MY WORDS API (Affirmations/Commitments)
export const myWordAPI = {
  getAll: async (userId: string): Promise<MyWord[]> => {
    try {
      const response = await apiClient.get('/mywords', {
        headers: { 'X-User-ID': userId }
      });
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching words:', error);
      return [];
    }
  },

  create: async (data: MyWord): Promise<MyWord> => {
    try {
      const response = await apiClient.post('/mywords', data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error creating word:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<MyWord>): Promise<MyWord> => {
    try {
      const response = await apiClient.put(`/mywords/${id}`, data, {
        headers: { 'X-User-ID': data.userId }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error updating word:', error);
      throw error;
    }
  },

  delete: async (id: string, userId: string): Promise<void> => {
    try {
      await apiClient.delete(`/mywords/${id}`, {
        headers: { 'X-User-ID': userId }
      });
    } catch (error) {
      console.error('❌ Error deleting word:', error);
      throw error;
    }
  }
};

export default {
  visionAPI,
  goalAPI,
  milestoneAPI,
  taskAPI,
  myWordAPI,
  todoAPI,
  reminderAPI,
  dailyPlanAPI,
  healthTrackerAPI,
  isOverdue,
  daysUntilDue,
  formatDate
};
