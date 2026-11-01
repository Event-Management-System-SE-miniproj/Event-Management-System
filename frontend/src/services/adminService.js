
import { api, apiRequest } from './api';

/**
 * Admin Service
 * Communicates with /api/admin endpoints.
 * All endpoints require ADMIN authentication.
 */
export const adminService = {
  // Fetch users with optional filters and pagination
  async getUsers(filters = {}) {
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const query = params.toString();

    return await api.get(
      `/api/admin/users${query ? `?${query}` : ''}`,
      { requiresAuth: true }
    );
  },

  // Fetch individual user details
  async getUserDetails(id) {
    return await api.get(`/api/admin/users/${id}`, {
      requiresAuth: true,
    });
  },

  // Update user role, name or status
  async updateUser(id, userData) {
    return await apiRequest(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: userData,
      requiresAuth: true,
    });
  },

  // Enable or disable a user
  async setUserStatus(id, status) {
    return await apiRequest(`/api/admin/users/${id}/status`, {
      method: 'PATCH',
      body: { status },
      requiresAuth: true,
    });
  },

  // Fetch events for admin review
  async getEvents(filters = {}) {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const query = params.toString();

    return await api.get(
      `/api/admin/events${query ? `?${query}` : ''}`,
      { requiresAuth: true }
    );
  },

  // Approve an event
  async approveEvent(id) {
    return await apiRequest(`/api/admin/events/${id}/approve`, {
      method: 'PATCH',
      requiresAuth: true,
    });
  },

  // Disable an event
  async disableEvent(id) {
    return await apiRequest(`/api/admin/events/${id}/disable`, {
      method: 'PATCH',
      requiresAuth: true,
    });
  },

  // Enable a disabled event
  async enableEvent(id) {
    return await apiRequest(`/api/admin/events/${id}/enable`, {
      method: 'PATCH',
      requiresAuth: true,
    });
  },

  // Fetch audit logs
  async getAuditLogs(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });

    const query = params.toString();

    return await api.get(
      `/api/admin/audit-logs${query ? `?${query}` : ''}`,
      { requiresAuth: true }
    );
  },

  // Fetch an individual audit log
  async getAuditLog(id) {
    return await api.get(`/api/admin/audit-logs/${id}`, {
      requiresAuth: true,
    });
  },
};
