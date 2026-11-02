import { api } from './api';

/**
 * Registration & Ticket Service
 * Manages event registration, user registration rosters, tickets, and participant lists.
 */
export const registrationService = {
  /**
   * F-008 & F-009: Register for an event
   */
  async registerForEvent(eventId, userId) {
    return await api.post('/api/registrations', {
      event_id: Number(eventId),
      user_id: Number(userId),
    });
  },

  /**
   * F-012: Fetch user's registered events with tickets & payment statuses
   */
  async getUserRegistrations(userId) {
    const endpoint = userId
      ? `/api/registrations/user/${userId}`
      : '/api/registrations/my';
    return await api.get(endpoint, { requiresAuth: true });
  },

  /**
   * F-012: Cancel an existing registration
   */
  async cancelRegistration(registrationId) {
    return await api.delete(`/api/registrations/${registrationId}`, {}, { requiresAuth: true });
  },

  /**
   * F-013: Get participant list for an event (Organizer view)
   */
  async getEventParticipants(eventId) {
    return await api.get(`/api/registrations/event/${eventId}`, { requiresAuth: true });
  },

  /**
   * F-011: Retrieve printable ticket for a registration
   */
  async getTicket(registrationId) {
    return await api.get(`/api/registrations/${registrationId}/ticket`, { requiresAuth: true });
  },
};

