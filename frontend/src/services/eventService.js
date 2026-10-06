import { api } from './api';

/**
 * Event Service
 * Communicates with /api/events and /api/registrations endpoints
 */
export const eventService = {
  /**
   * F-006: Search and Filter Events
   * Supported query params: search, venue, event_date, registration_open
   */
  async getEvents(filters = {}) {
    const params = new URLSearchParams();

    if (filters.search && filters.search.trim()) {
      params.append('search', filters.search.trim());
    }
    if (filters.venue && filters.venue.trim()) {
      params.append('venue', filters.venue.trim());
    }
    if (filters.event_date && filters.event_date.trim()) {
      params.append('event_date', filters.event_date.trim());
    }
    if (filters.registration_open !== undefined && filters.registration_open !== '') {
      params.append('registration_open', filters.registration_open);
    }

    const queryString = params.toString();
    const endpoint = `/api/events${queryString ? `?${queryString}` : ''}`;
    return await api.get(endpoint);
  },

  /**
   * F-007: View Event Details by ID
   */
  async getEventById(id) {
    return await api.get(`/api/events/${id}`);
  },

  /**
   * F-004: Create Event
   */
  async createEvent(eventData) {
    return await api.post('/api/events', eventData);
  },

  /**
   * F-005: Update Event
   */
  async updateEvent(id, eventData) {
    return await api.put(`/api/events/${id}`, eventData);
  },

  /**
   * F-005: Delete Event
   */
  async deleteEvent(id, organizerId) {
    return await api.delete(`/api/events/${id}`, { organizer_id: organizerId });
  },

  /**
   * F-008 & F-009: Register for Event
   */
  async registerForEvent(eventId, userId) {
    return await api.post('/api/registrations', {
      event_id: eventId,
      user_id: userId,
    });
  },
};
