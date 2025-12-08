import axios from 'axios';

// Using window location as fallback for development
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ==================== USER SERVICE ====================
export const userService = {
  register: (data) => axiosInstance.post('/users/register', data),
  signin: (data) => axiosInstance.post('/users/signin', data),
  getProfile: (userId) => axiosInstance.get(`/users/profile/${userId}`),
  getByEmail: (email) => axiosInstance.get(`/users/email/${email}`),
  updateProfile: (userId, data) => axiosInstance.put(`/users/profile/${userId}`, data),
  changePassword: (userId, data) => axiosInstance.post(`/users/change-password/${userId}`, data)
};

// ==================== CART SERVICE ====================
export const cartService = {
  getCartByUserId: (userId) => axiosInstance.get(`/carts/${userId}`),
  getCartByEmail: (email) => axiosInstance.get(`/carts/email/${email}`),
  addToCart: (data) => axiosInstance.post('/carts', data),
  updateQuantity: (userId, workshopId, data) => axiosInstance.put(`/carts/${userId}/item/${workshopId}`, data),
  removeFromCart: (userId, workshopId) => axiosInstance.delete(`/carts/${userId}/item/${workshopId}`),
  clearCart: (userId) => axiosInstance.post(`/carts/${userId}/clear`),
  checkout: (userId) => axiosInstance.post(`/carts/${userId}/checkout`),
  deleteCart: (userId) => axiosInstance.delete(`/carts/${userId}`)
};

// ==================== ADMIN SERVICE ====================
export const adminService = {
  signin: (data) => axiosInstance.post('/admin-mongo/signin', data),
  getProfile: (adminId) => axiosInstance.get(`/admin-mongo/profile/${adminId}`),
  createAdmin: (data) => axiosInstance.post('/admin-mongo/create', data),
  updateProfile: (adminId, data) => axiosInstance.put(`/admin-mongo/profile/${adminId}`, data),
  getAllAdmins: () => axiosInstance.get('/admin-mongo/all'),
  changePassword: (adminId, data) => axiosInstance.post(`/admin-mongo/change-password/${adminId}`, data),
  deactivate: (adminId) => axiosInstance.post(`/admin-mongo/deactivate/${adminId}`)
};

// ==================== VISION SERVICE ====================
export const visionService = {
  getAll: (userId) => axiosInstance.get(`/visions/${userId}`),
  getOne: (id) => axiosInstance.get(`/visions/single/${id}`),
  create: (data) => axiosInstance.post('/visions', data),
  update: (id, data) => axiosInstance.put(`/visions/${id}`, data),
  delete: (id) => axiosInstance.delete(`/visions/${id}`)
};

// ==================== GOAL SERVICE ====================
export const goalService = {
  getAll: (userId) => axiosInstance.get(`/goals/${userId}`),
  getOne: (id) => axiosInstance.get(`/goals/single/${id}`),
  create: (data) => axiosInstance.post('/goals', data),
  update: (id, data) => axiosInstance.put(`/goals/${id}`, data),
  delete: (id) => axiosInstance.delete(`/goals/${id}`)
};

// ==================== TASK SERVICE ====================
export const taskService = {
  getAll: (userId) => axiosInstance.get(`/tasks/${userId}`),
  getOne: (id) => axiosInstance.get(`/tasks/single/${id}`),
  create: (data) => axiosInstance.post('/tasks', data),
  update: (id, data) => axiosInstance.put(`/tasks/${id}`, data),
  delete: (id) => axiosInstance.delete(`/tasks/${id}`)
};

// ==================== TODO SERVICE ====================
export const todoService = {
  getAll: (userId) => axiosInstance.get(`/todos/${userId}`),
  getOne: (id) => axiosInstance.get(`/todos/single/${id}`),
  create: (data) => axiosInstance.post('/todos', data),
  update: (id, data) => axiosInstance.put(`/todos/${id}`, data),
  delete: (id) => axiosInstance.delete(`/todos/${id}`)
};

// ==================== MYWORD SERVICE ====================
export const mywordService = {
  getAll: (userId) => axiosInstance.get(`/mywords/${userId}`),
  getOne: (id) => axiosInstance.get(`/mywords/single/${id}`),
  create: (data) => axiosInstance.post('/mywords', data),
  update: (id, data) => axiosInstance.put(`/mywords/${id}`, data),
  delete: (id) => axiosInstance.delete(`/mywords/${id}`)
};

// ==================== HEALTH TRACKER SERVICE ====================
export const healthService = {
  getByDate: (userId, date) => axiosInstance.get(`/health/${userId}/${date}`),
  getAll: (userId) => axiosInstance.get(`/health/${userId}`),
  create: (data) => axiosInstance.post('/health', data),
  update: (id, data) => axiosInstance.put(`/health/${id}`, data),
  delete: (id) => axiosInstance.delete(`/health/${id}`)
};

// ==================== BATCH OPERATIONS ====================
export const batchService = {
  getAllData: async (userId) => {
    try {
      const responses = await Promise.allSettled([
        visionService.getAll(userId),
        goalService.getAll(userId),
        taskService.getAll(userId),
        todoService.getAll(userId),
        mywordService.getAll(userId),
        healthService.getAll(userId)
      ]);

      return {
        visions: responses[0].status === 'fulfilled' ? responses[0].value.data : [],
        goals: responses[1].status === 'fulfilled' ? responses[1].value.data : [],
        tasks: responses[2].status === 'fulfilled' ? responses[2].value.data : [],
        todos: responses[3].status === 'fulfilled' ? responses[3].value.data : [],
        mywords: responses[4].status === 'fulfilled' ? responses[4].value.data : [],
        health: responses[5].status === 'fulfilled' ? responses[5].value.data : []
      };
    } catch (error) {
      console.error('Error fetching batch data:', error);
      throw error;
    }
  }
};

export default {
  userService,
  cartService,
  adminService,
  visionService,
  goalService,
  taskService,
  todoService,
  mywordService,
  healthService,
  batchService
};

// ==================== MILESTONE SERVICE ====================
export const milestoneService = {
  getAll: (userId) => axiosInstance.get(`/milestones/${userId}`),
  getOne: (userId, milestoneId) => axiosInstance.get(`/milestones/${userId}/${milestoneId}`),
  create: (data) => axiosInstance.post('/milestones', data),
  update: (userId, milestoneId, data) => axiosInstance.put(`/milestones/${userId}/${milestoneId}`, data),
  linkVision: (userId, milestoneId, visionId) => axiosInstance.post(`/milestones/${userId}/${milestoneId}/link-vision`, { visionId }),
  addTasks: (userId, milestoneId, taskIds) => axiosInstance.post(`/milestones/${userId}/${milestoneId}/add-tasks`, { taskIds }),
  addTodos: (userId, milestoneId, todoIds) => axiosInstance.post(`/milestones/${userId}/${milestoneId}/add-todos`, { todoIds }),
  delete: (userId, milestoneId) => axiosInstance.delete(`/milestones/${userId}/${milestoneId}`)
};

// ==================== REMINDER SERVICE ====================
export const reminderService = {
  getAll: (userId) => axiosInstance.get(`/reminders/${userId}`),
  getOne: (userId, reminderId) => axiosInstance.get(`/reminders/${userId}/${reminderId}`),
  create: (data) => axiosInstance.post('/reminders', data),
  update: (userId, reminderId, data) => axiosInstance.put(`/reminders/${userId}/${reminderId}`, data),
  snooze: (userId, reminderId, snoozeMinutes) => axiosInstance.post(`/reminders/${userId}/${reminderId}/snooze`, { snoozeMinutes }),
  dismiss: (userId, reminderId) => axiosInstance.post(`/reminders/${userId}/${reminderId}/dismiss`),
  complete: (userId, reminderId) => axiosInstance.post(`/reminders/${userId}/${reminderId}/complete`),
  getUpcoming: (userId, days) => axiosInstance.get(`/reminders/${userId}/upcoming`, { params: { days } }),
  delete: (userId, reminderId) => axiosInstance.delete(`/reminders/${userId}/${reminderId}`)
};
