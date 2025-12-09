import axios from 'axios';

// Use environment variable for API URL, with sensible defaults
const API_BASE_URL = (() => {
  // Priority: env variable > localhost detection > fallback URL
  if ((import.meta as any).env.VITE_API_URL) {
    console.log('📡 Using VITE_API_URL from environment:', (import.meta as any).env.VITE_API_URL);
    return (import.meta as any).env.VITE_API_URL;
  }
  
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('📡 Using localhost API (development)');
    return 'http://localhost:4000/api';
  }
  
  // Default for production - use Vercel backend
  const fallback = (import.meta as any).env.VITE_PRODUCTION_API_URL || 'https://swar-yoga-latest-dogliiw3r-swar-yoga-projects.vercel.app/api';
  console.log('📡 Using production API:', fallback);
  return fallback;
})();

// Get current user ID from localStorage
export function getCurrentUserId(): string | null {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      const userId = user.id || null;
      console.log('👤 getCurrentUserId:', userId);
      return userId;
    } else {
      console.warn('⚠️ No user data in localStorage');
    }
  } catch (e) {
    console.warn('Could not retrieve user ID from localStorage', e);
  }
  return null;
}

// Create axios instance with timeout and retry logic
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add userId to all requests
apiClient.interceptors.request.use((config) => {
  const userId = getCurrentUserId();
  if (userId) {
    config.headers['X-User-ID'] = userId;
    // Also add to query params for GET requests
    if (config.method === 'get') {
      config.params = config.params || {};
      config.params.userId = userId;
    } else {
      // Add to body for POST/PUT requests
      if (typeof config.data === 'object' && config.data !== null) {
        config.data.userId = userId;
      }
    }
    console.log(`📤 API Request - ${config.method?.toUpperCase()} ${config.url} (userId: ${userId})`, config.data);
  } else {
    console.warn('⚠️ No userId found in localStorage - requests may fail');
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response - ${response.status}`, response.config.method?.toUpperCase(), response.config.url, response.data);
    return response;
  },
  (error) => {
    const errorMsg = error.response?.data?.error || error.response?.data || error.message;
    const status = error.response?.status;
    console.error(`❌ API Error [${status}] - ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, errorMsg);
    return Promise.reject(error);
  }
);

// ⚠️ NO MOCK DATA - All data is persisted via backend API only
// Components must handle loading states and errors properly

// ===== VISION API =====
export const visionAPI = {
  getAll: async (year?: number) => {
    try {
      const params = year ? { year } : {};
      const response = await apiClient.get('/visions', { params });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching visions:', error);
      return [];
    }
  },
  
  create: async (visionData: any) => {
    try {
      const payload = {
        ...visionData,
        title: visionData.title || visionData.name || 'Untitled Vision',
        year: visionData.year || new Date().getFullYear(),
      };
      console.log('Creating vision with payload:', payload);
      const response = await apiClient.post('/visions', payload);
      console.log('Vision created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating vision:', error);
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Failed to create vision: ${errorMsg}`);
    }
  },
  
  update: async (id: number, visionData: any) => {
    try {
      const response = await apiClient.put(`/visions/${id}`, visionData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating vision:', error);
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Failed to update vision: ${errorMsg}`);
    }
  },
  
  delete: async (id: number) => {
    try {
      const response = await apiClient.delete(`/visions/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting vision:', error);
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Failed to delete vision: ${errorMsg}`);
    }
  }
};

// ===== GOALS API =====
export const goalsAPI = {
  getAll: async (year?: number) => {
    try {
      const params = year ? { year } : {};
      const response = await apiClient.get('/goals', { params });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching goals:', error);
      return [];
    }
  },
  
  create: async (goalData: any) => {
    try {
      // Ensure required fields
      const payload = {
        ...goalData,
        title: goalData.title || goalData.name || 'Untitled Goal',
        description: goalData.description || '',
        status: goalData.status || 'In Progress',
        progress: goalData.progress ?? 0,
      };
      console.log('Creating goal with payload:', payload);
      const response = await apiClient.post('/goals', payload);
      console.log('Goal created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating goal:', error);
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Failed to create goal: ${errorMsg}`);
    }
  },
  
  update: async (id: number, goalData: any) => {
    try {
      const response = await apiClient.put(`/goals/${id}`, goalData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating goal:', error);
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Failed to update goal: ${errorMsg}`);
    }
  },
  
  delete: async (id: number) => {
    try {
      const response = await apiClient.delete(`/goals/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Failed to delete goal: ${errorMsg}`);
    }
  }
};

// ===== TASKS API =====
export const tasksAPI = {
  getAll: async (userId?: string | number) => {
    try {
      const uid = userId || getCurrentUserId();
      if (!uid) return [];
      const response = await apiClient.get(`/tasks/${uid}`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      return [];
    }
  },
  
  create: async (taskData: any) => {
    try {
      const payload = {
        ...taskData,
        particulars: taskData.particulars || taskData.title || 'Untitled Task',
        status: taskData.status || 'Pending',
      };
      console.log('Creating task:', payload);
      const response = await apiClient.post('/tasks', payload);
      return response.data;
    } catch (error: any) {
      console.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error.response?.data?.message || error.message}`);
    }
  },
  
  update: async (id: number, taskData: any) => {
    try {
      const response = await apiClient.put(`/tasks/${id}`, taskData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating task:', error);
      throw new Error(`Failed to update task: ${error.response?.data?.message || error.message}`);
    }
  },
  
  delete: async (id: number) => {
    try {
      const response = await apiClient.delete(`/tasks/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting task:', error);
      throw new Error(`Failed to delete task: ${error.response?.data?.message || error.message}`);
    }
  }
};

// ===== TODOS API =====
export const todosAPI = {
  getAll: async (userId?: string) => {
    try {
      const uid = userId || getCurrentUserId();
      if (!uid) return [];
      const response = await apiClient.get(`/todos/${uid}`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching todos:', error);
      return [];
    }
  },

  getByDate: async (userId: string, date: string) => {
    try {
      const uid = userId || getCurrentUserId();
      if (!uid) return [];
      const response = await apiClient.get(`/todos/${uid}/${date}`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching todos by date:', error);
      return [];
    }
  },

  create: async (todoData: any) => {
    try {
      const uid = getCurrentUserId();
      if (!uid) throw new Error('User not authenticated');
      
      const payload = {
        userId: uid,
        title: todoData.title || todoData.text || 'Untitled',
        description: todoData.description || '',
        dueDate: todoData.dueDate || '',
        dueTime: todoData.dueTime || '',
        priority: todoData.priority || 'Medium',
        category: todoData.category || 'Personal',
        reminder: todoData.reminder || false,
        reminderTime: todoData.reminderTime || '',
        linkedTaskId: todoData.linkedTaskId || '',
        linkedTaskTitle: todoData.linkedTaskTitle || '',
        tags: todoData.tags || [],
        completed: false
      };

      const response = await apiClient.post('/todos', payload);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating todo:', error);
      throw new Error(`Failed to create todo: ${error.response?.data?.message || error.message}`);
    }
  },

  update: async (id: string, todoData: any) => {
    try {
      const response = await apiClient.put(`/todos/${id}`, todoData);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error updating todo:', error);
      throw new Error(`Failed to update todo: ${error.response?.data?.message || error.message}`);
    }
  },

  delete: async (id: string) => {
    try {
      const response = await apiClient.delete(`/todos/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error deleting todo:', error);
      throw new Error(`Failed to delete todo: ${error.response?.data?.message || error.message}`);
    }
  }
};

// ===== DAILY WORDS API =====
export const dailyWordsAPI = {
  getAll: async (date?: string) => {
    try {
      const params = date ? { date } : {};
      const response = await apiClient.get('/daily-words', { params });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching daily words:', error);
      return [];
    }
  },
  
  create: async (wordData: any) => {
    try {
      const payload = { ...wordData, text: wordData.text || wordData.word || 'My Word' };
      console.log('Creating daily word:', payload);
      const response = await apiClient.post('/daily-words', payload);
      return response.data;
    } catch (error: any) {
      console.error('Error creating daily word:', error);
      throw new Error(`Failed to create word: ${error.response?.data?.message || error.message}`);
    }
  },
  
  update: async (id: number, wordData: any) => {
    try {
      const response = await apiClient.put(`/daily-words/${id}`, wordData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating daily word:', error);
      throw new Error(`Failed to update word: ${error.response?.data?.message || error.message}`);
    }
  },
  
  delete: async (id: number) => {
    try {
      const response = await apiClient.delete(`/daily-words/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting daily word:', error);
      throw new Error(`Failed to delete word: ${error.response?.data?.message || error.message}`);
    }
  }
};

// ===== AFFIRMATIONS API =====
export const affirmationsAPI = {
  getAll: async () => {
    try {
      const response = await apiClient.get('/affirmations');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching affirmations:', error);
      return [];
    }
  },

  create: async (data: any) => {
    try {
      const payload = { ...data, text: data.text || data.affirmation || 'My Affirmation' };
      console.log('Creating affirmation:', payload);
      const response = await apiClient.post('/affirmations', payload);
      return response.data;
    } catch (error: any) {
      console.error('Error creating affirmation:', error);
      throw new Error(`Failed to create affirmation: ${error.response?.data?.message || error.message}`);
    }
  },

  update: async (id: number, data: any) => {
    try {
      const response = await apiClient.put(`/affirmations/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating affirmation:', error);
      throw new Error(`Failed to update affirmation: ${error.response?.data?.message || error.message}`);
    }
  },

  delete: async (id: number) => {
    try {
      const response = await apiClient.delete(`/affirmations/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting affirmation:', error);
      throw new Error(`Failed to delete affirmation: ${error.response?.data?.message || error.message}`);
    }
  }
};

// ===== HEALTH API =====
export const healthAPI = {
  getAll: async (userId?: string) => {
    try {
      const uid = userId || getCurrentUserId();
      if (!uid) return [];
      const response = await apiClient.get(`/health/${uid}`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching health data:', error);
      return [];
    }
  },

  getByDate: async (userId: string, date: string) => {
    try {
      const uid = userId || getCurrentUserId();
      if (!uid) return null;
      const response = await apiClient.get(`/health/${uid}/${date}`);
      return response.data || null;
    } catch (error) {
      console.error('❌ Error fetching health data for date:', error);
      return null;
    }
  },

  create: async (healthData: any) => {
    try {
      const payload = {
        ...healthData,
        userId: healthData.userId || getCurrentUserId(),
      };
      console.log('✅ Creating health entry:', payload);
      const response = await apiClient.post('/health', payload);
      console.log('✅ Health entry created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating health entry:', error);
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Failed to create health entry: ${errorMsg}`);
    }
  },

  update: async (id: string, healthData: any) => {
    try {
      const response = await apiClient.put(`/health/${id}`, healthData);
      console.log('✅ Health entry updated:', id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error updating health entry:', error);
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Failed to update health entry: ${errorMsg}`);
    }
  },

  delete: async (id: string) => {
    try {
      const response = await apiClient.delete(`/health/${id}`);
      console.log('✅ Health entry deleted:', id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error deleting health entry:', error);
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Failed to delete health entry: ${errorMsg}`);
    }
  }
};

// ===== PEOPLE API (DIAMOND PEOPLE) =====
export const peopleAPI = {
  getAll: async () => {
    try {
      const response = await apiClient.get('/people');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching people:', error);
      return [];
    }
  },

  create: async (personData: any) => {
    try {
      const payload = { ...personData, name: personData.name || 'New Person' };
      console.log('Creating person:', payload);
      const response = await apiClient.post('/people', payload);
      return response.data;
    } catch (error: any) {
      console.error('Error creating person:', error);
      throw new Error(`Failed to create person: ${error.response?.data?.message || error.message}`);
    }
  },

  update: async (id: number, personData: any) => {
    try {
      const response = await apiClient.put(`/people/${id}`, personData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating person:', error);
      throw new Error(`Failed to update person: ${error.response?.data?.message || error.message}`);
    }
  },

  delete: async (id: number) => {
    try {
      const response = await apiClient.delete(`/people/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting person:', error);
      throw new Error(`Failed to delete person: ${error.response?.data?.message || error.message}`);
    }
  }
};

// ===== BACKUP & RESTORE API =====
export const backupAPI = {
  // Create a full backup of all user data
  createBackup: async () => {
    try {
      const response = await apiClient.post('/backup/create', {});
      return response.data;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  },

  // Get list of all backups for the user
  listBackups: async () => {
    try {
      const response = await apiClient.get('/backup/list');
      return response.data || [];
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  },

  // Restore data from a specific backup
  restoreBackup: async (backupId: string) => {
    try {
      const response = await apiClient.post(`/backup/restore/${backupId}`, {});
      return response.data;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw error;
    }
  },

  // Delete a specific backup
  deleteBackup: async (backupId: string) => {
    try {
      const response = await apiClient.delete(`/backup/${backupId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw error;
    }
  },

  // Export all data as JSON file (download)
  exportDataAsJSON: async () => {
    try {
      const [visions, goals, tasks, todos, words, affirmations, health, people] = await Promise.all([
        visionAPI.getAll().catch(() => []),
        goalsAPI.getAll().catch(() => []),
        tasksAPI.getAll().catch(() => []),
        todosAPI.getAll().catch(() => []),
        dailyWordsAPI.getAll().catch(() => []),
        affirmationsAPI.getAll().catch(() => []),
        healthAPI.getAll().catch(() => []),
        peopleAPI.getAll().catch(() => []),
      ]);

      const backup = {
        userId: getCurrentUserId(),
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          visions,
          goals,
          tasks,
          todos,
          dailyWords: words,
          affirmations,
          health,
          people,
        }
      };

      return backup;
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  },

  // Download backup as JSON file
  downloadBackupFile: async () => {
    try {
      const backup = await backupAPI.exportDataAsJSON();
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `swar-yoga-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Failed to download backup file:', error);
      throw error;
    }
  },

  // Import and restore data from uploaded JSON file
  importFromJSON: async (jsonFile: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const backup = JSON.parse(content);

          // Validate backup structure
          if (!backup.data || !backup.userId) {
            throw new Error('Invalid backup file format');
          }

          // Send to server for restoration
          const response = await apiClient.post('/backup/import', { backup });
          resolve(response.data.success || true);
        } catch (error) {
          console.error('Failed to import backup:', error);
          reject(error);
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(jsonFile);
    });
  }
};

// ===== TEST CONNECTION =====
export const testConnection = async () => {
  try {
    const response = await apiClient.get('/health');
    console.log('✅ Backend API available');
    return true;
  } catch (err) {
    console.error('❌ Backend API unavailable:', err?.message);
    return false;
  }
};

// ===== PAGE STATE PERSISTENCE =====
// Save current page/route so on refresh, users return to the same page

export const pageStateAPI = {
  // Save current page state
  savePage: async (pageName: string, pageData?: any) => {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        console.warn('No userId for page state persistence');
        return null;
      }

      const pageState = {
        userId,
        pageName,
        pageData: pageData || {},
        timestamp: new Date().toISOString(),
        lastVisited: new Date().toISOString(),
      };

      // Save to localStorage first (instant)
      localStorage.setItem(`page-state-${userId}`, JSON.stringify(pageState));

      // Save to server (async, non-blocking)
      try {
        await apiClient.post('/page-state', pageState);
      } catch (err) {
        console.warn('Could not save page state to server:', err?.message);
        // Fallback to localStorage is already done
      }

      return pageState;
    } catch (err) {
      console.error('Error saving page state:', err);
      return null;
    }
  },

  // Get last visited page
  getLastPage: async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        console.warn('No userId for page state retrieval');
        return null;
      }

      // Check localStorage first (instant)
      const localPageState = localStorage.getItem(`page-state-${userId}`);
      if (localPageState) {
        return JSON.parse(localPageState);
      }

      // Fallback to server
      try {
        const response = await apiClient.get('/page-state', {
          params: { userId },
        });
        
        if (response.data && response.data.pageName) {
          // Cache in localStorage
          localStorage.setItem(`page-state-${userId}`, JSON.stringify(response.data));
          return response.data;
        }
      } catch (err) {
        console.warn('Could not get page state from server:', err?.message);
      }

      return null;
    } catch (err) {
      console.error('Error getting page state:', err);
      return null;
    }
  },

  // Clear page state (on logout)
  clearPage: async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      // Clear localStorage
      localStorage.removeItem(`page-state-${userId}`);

      // Clear from server
      try {
        await apiClient.delete('/page-state', {
          params: { userId },
        });
      } catch (err) {
        console.warn('Could not delete page state from server:', err?.message);
      }
    } catch (err) {
      console.error('Error clearing page state:', err);
    }
  },
};

// ===== DAILY PLANS API =====
export const dailyPlansAPI = {
  getAll: async (userId?: string) => {
    try {
      const uid = userId || getCurrentUserId();
      if (!uid) return [];
      const response = await apiClient.get(`/dailyplans/${uid}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching daily plans:', error);
      return [];
    }
  },

  getByDate: async (userId: string, date: string) => {
    try {
      const response = await apiClient.get(`/dailyplans/${userId}/${date}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching daily plans for date:', error);
      return [];
    }
  },

  create: async (planData: any) => {
    try {
      const payload = {
        ...planData,
        userId: planData.userId || getCurrentUserId(),
      };
      console.log('Creating daily plan with payload:', payload);
      const response = await apiClient.post('/dailyplans', payload);
      console.log('Daily plan created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating daily plan:', error);
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Failed to create daily plan: ${errorMsg}`);
    }
  },

  update: async (id: string, planData: any) => {
    try {
      const response = await apiClient.put(`/dailyplans/${id}`, planData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating daily plan:', error);
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Failed to update daily plan: ${errorMsg}`);
    }
  },

  delete: async (id: string) => {
    try {
      const response = await apiClient.delete(`/dailyplans/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting daily plan:', error);
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Failed to delete daily plan: ${errorMsg}`);
    }
  }
};

// ==================== REMINDERS API ====================
export const remindersAPI = {
  getAll: async (userId?: string) => {
    try {
      const uid = userId || getCurrentUserId();
      if (!uid) return [];
      const response = await apiClient.get(`/reminders/${uid}`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching reminders:', error);
      return [];
    }
  },

  getByDate: async (userId: string, date: string) => {
    try {
      const uid = userId || getCurrentUserId();
      if (!uid) return [];
      const response = await apiClient.get(`/reminders/${uid}/${date}`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching reminders by date:', error);
      return [];
    }
  },

  getUpcoming: async (userId?: string) => {
    try {
      const uid = userId || getCurrentUserId();
      if (!uid) return [];
      const response = await apiClient.get(`/reminders/${uid}/upcoming/list`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching upcoming reminders:', error);
      return [];
    }
  },

  create: async (reminderData: any) => {
    try {
      const uid = getCurrentUserId();
      if (!uid) throw new Error('User not authenticated');

      const payload = {
        userId: uid,
        title: reminderData.title || 'Untitled Reminder',
        description: reminderData.description || '',
        reminderDate: reminderData.reminderDate,
        reminderTime: reminderData.reminderTime || '09:00',
        priority: reminderData.priority || 'Medium',
        category: reminderData.category || 'Personal',
        reminderType: reminderData.reminderType || 'Custom',
        relatedId: reminderData.relatedId || '',
        relatedTitle: reminderData.relatedTitle || ''
      };

      const response = await apiClient.post('/reminders', payload);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating reminder:', error);
      throw new Error(`Failed to create reminder: ${error.response?.data?.message || error.message}`);
    }
  },

  update: async (id: string, reminderData: any) => {
    try {
      const response = await apiClient.put(`/reminders/${id}`, reminderData);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error updating reminder:', error);
      throw new Error(`Failed to update reminder: ${error.response?.data?.message || error.message}`);
    }
  },

  snooze: async (id: string, minutes: number) => {
    try {
      const response = await apiClient.put(`/reminders/${id}/snooze`, { minutes });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error snoozing reminder:', error);
      throw new Error(`Failed to snooze reminder: ${error.response?.data?.message || error.message}`);
    }
  },

  complete: async (id: string) => {
    try {
      const response = await apiClient.put(`/reminders/${id}/complete`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error completing reminder:', error);
      throw new Error(`Failed to complete reminder: ${error.response?.data?.message || error.message}`);
    }
  },

  dismiss: async (id: string) => {
    try {
      const response = await apiClient.put(`/reminders/${id}/dismiss`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error dismissing reminder:', error);
      throw new Error(`Failed to dismiss reminder: ${error.response?.data?.message || error.message}`);
    }
  },

  delete: async (id: string) => {
    try {
      const response = await apiClient.delete(`/reminders/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error deleting reminder:', error);
      throw new Error(`Failed to delete reminder: ${error.response?.data?.message || error.message}`);
    }
  }
};