import axios from 'axios';

// In production (Railway), API is on same domain. In development, use proxy via Vite
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (email, password, name, phone, address, postal_code, city, birth_date) =>
    api.post('/auth/register', { email, password, name, phone, address, postal_code, city, birth_date }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  getMe: () =>
    api.get('/auth/me'),

  updateProfile: (data) =>
    api.put('/auth/profile', data),

  getTelegramLink: () =>
    api.get('/auth/telegram-link'),

  getTelegramStatus: () =>
    api.get('/auth/telegram-status')
};

// Students API
export const studentsApi = {
  getAll: () =>
    api.get('/students'),

  getById: (id) =>
    api.get(`/students/${id}`),

  create: (data) =>
    api.post('/students', data),

  update: (id, data) =>
    api.put(`/students/${id}`, data),

  delete: (id) =>
    api.delete(`/students/${id}`),

  getTelegramLink: (id) =>
    api.get(`/students/${id}/telegram-link`),

  getTelegramStatus: (id) =>
    api.get(`/students/${id}/telegram-status`)
};

// Homework API
export const homeworkApi = {
  parse: (text) =>
    api.post('/homework/parse', { text }),

  getByStudent: (studentId) =>
    api.get(`/homework/student/${studentId}`),

  getTodayByStudent: (studentId) =>
    api.get(`/homework/student/${studentId}/today`),

  getWeekByStudent: (studentId) =>
    api.get(`/homework/student/${studentId}/week`),

  create: (studentId, homework) =>
    api.post(`/homework/student/${studentId}`, homework),

  createBatch: (studentId, items) =>
    api.post(`/homework/student/${studentId}`, { items }),

  update: (id, updates) =>
    api.put(`/homework/${id}`, updates),

  delete: (id) =>
    api.delete(`/homework/${id}`)
};

// Schools API
export const schoolsApi = {
  getAll: () =>
    api.get('/schools'),

  getById: (id) =>
    api.get(`/schools/${id}`),

  search: (query) =>
    api.get(`/schools/search?q=${encodeURIComponent(query)}`),

  create: (data) =>
    api.post('/schools', data),

  update: (id, data) =>
    api.put(`/schools/${id}`, data),

  delete: (id) =>
    api.delete(`/schools/${id}`)
};

// Teachers API
export const teachersApi = {
  getAll: () =>
    api.get('/teachers'),

  getById: (id) =>
    api.get(`/teachers/${id}`),

  getByStudent: (studentId) =>
    api.get(`/teachers/student/${studentId}`),

  getBySchool: (schoolId) =>
    api.get(`/teachers/school/${schoolId}`),

  create: (data) =>
    api.post('/teachers', data),

  update: (id, data) =>
    api.put(`/teachers/${id}`, data),

  delete: (id) =>
    api.delete(`/teachers/${id}`)
};

// Schedule API
export const scheduleApi = {
  getByStudent: (studentId) =>
    api.get(`/schedule/student/${studentId}`),

  getToday: (studentId) =>
    api.get(`/schedule/student/${studentId}/today`),

  getByDay: (studentId, dayOfWeek) =>
    api.get(`/schedule/student/${studentId}/day/${dayOfWeek}`),

  getById: (id) =>
    api.get(`/schedule/${id}`),

  create: (data) =>
    api.post('/schedule', data),

  update: (id, data) =>
    api.put(`/schedule/${id}`, data),

  delete: (id) =>
    api.delete(`/schedule/${id}`),

  deleteAll: (studentId) =>
    api.delete(`/schedule/student/${studentId}/all`)
};

export default api;
