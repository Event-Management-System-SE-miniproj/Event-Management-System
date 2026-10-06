import { api, tokenStorage, userStorage } from './api';

/**
 * Authentication Service
 * Communicates with /api/auth and /api/users endpoints
 */
export const authService = {
  /**
   * F-001: Register a new user account
   * Endpoint: POST /api/auth/register
   */
  async register({ name, email, password }) {
    return await api.post('/api/auth/register', { name, email, password });
  },

  /**
   * F-002: Authenticate user & store JWT session
   * Endpoint: POST /api/auth/login
   */
  async login({ email, password }) {
    const data = await api.post('/api/auth/login', { email, password });
    if (data && data.token) {
      tokenStorage.set(data.token);
      if (data.user) {
        userStorage.set(data.user);
      }
    }
    return data;
  },

  /**
   * F-003: Fetch current user profile
   * Endpoint: GET /api/users/profile
   */
  async getProfile() {
    const data = await api.get('/api/users/profile', { requiresAuth: true });
    if (data && data.user) {
      userStorage.set(data.user);
    }
    return data;
  },

  /**
   * F-003: Update user profile
   * Endpoint: PUT /api/users/profile
   */
  async updateProfile({ name, email }) {
    const data = await api.put('/api/users/profile', { name, email }, { requiresAuth: true });
    if (data && data.user) {
      userStorage.set(data.user);
    }
    return data;
  },

  /**
   * Logout user by purging local storage credentials
   */
  logout() {
    tokenStorage.remove();
    userStorage.remove();
  },

  /**
   * Check if user is currently authenticated locally
   */
  isAuthenticated() {
    return !!tokenStorage.get();
  },

  /**
   * Retrieve cached user details
   */
  getCurrentUser() {
    return userStorage.get();
  },
};
