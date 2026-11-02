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

  // Alias for compatibility
  async updateUserStatus(id, status) {
    return await this.setUserStatus(id, status);
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

  // Update event status (maps to approve, disable, or enable)
  async updateEventStatus(id, { status, registration_open }) {
    const upper = (status || '').toUpperCase();
    if (upper === 'ACTIVE' || upper === 'APPROVED') {
      return await this.approveEvent(id);
    }
    if (upper === 'DISABLED') {
      return await this.disableEvent(id);
    }
    return await this.enableEvent(id);
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

  // Dashboard statistics computation
  async getStats() {
    try {
      const [usersRes, eventsRes, logsRes] = await Promise.all([
        this.getUsers().catch(() => ({ users: [], total: 0 })),
        this.getEvents().catch(() => ({ events: [], count: 0 })),
        this.getAuditLogs().catch(() => ({ logs: [], count: 0 })),
      ]);

      const users = usersRes?.users || [];
      const events = eventsRes?.events || [];
      const logs = logsRes?.logs || [];

      const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
      const activeEvents = events.filter((e) => e.status === 'ACTIVE').length;
      const totalRegistrations = events.reduce(
        (sum, e) => sum + (Number(e.registered_count || e.participant_count) || 0),
        0
      );

      return {
        stats: {
          totalUsers: usersRes.total || users.length,
          activeUsers,
          totalEvents: eventsRes.count || events.length,
          activeEvents,
          totalRegistrations,
          totalAuditLogs: logsRes.count || logs.length,
        },
      };
    } catch (e) {
      return {
        stats: {
          totalUsers: 0,
          activeUsers: 0,
          totalEvents: 0,
          activeEvents: 0,
          totalRegistrations: 0,
          totalAuditLogs: 0,
        },
      };
    }
  },
};
