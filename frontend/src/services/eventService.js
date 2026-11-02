import { api, apiRequest } from './api';

export const eventService = {
  // Fetch all events with optional filters
  async getEvents(filters = {}) {
    const params = new URLSearchParams();

    if (filters.search?.trim()) {
      params.append('search', filters.search.trim());
    }

    if (filters.venue?.trim()) {
      params.append('venue', filters.venue.trim());
    }

    if (filters.event_date?.trim()) {
      params.append('event_date', filters.event_date.trim());
    }

    if (
      filters.registration_open !== undefined &&
      filters.registration_open !== ''
    ) {
      params.append('registration_open', filters.registration_open);
    }

    if (filters.organizer_id) {
      params.append('organizer_id', filters.organizer_id);
    }

    const queryString = params.toString();
    const endpoint = `/api/events${queryString ? `?${queryString}` : ''}`;

    return await api.get(endpoint);
  },

  // Fetch a single event
  async getEventById(id) {
    return await api.get(`/api/events/${id}`);
  },

  // Create an event
  async createEvent(eventData) {
    return await api.post('/api/events', eventData);
  },

  // Update an event
  async updateEvent(id, eventData) {
    return await api.put(`/api/events/${id}`, eventData);
  },

  // Delete an event
  async deleteEvent(id, organizerId) {
    return await api.delete(`/api/events/${id}`, {
      organizer_id: organizerId,
    });
  },

  // Get events created by logged-in organizer
  async getMyEvents() {
    return await api.get('/api/events/mine', {
      requiresAuth: true,
    });
  },

  // Register for an event
  async registerForEvent(eventId, userId) {
    return await api.post('/api/registrations', {
      event_id: eventId,
      user_id: userId,
    });
  },

  // Get logged-in user's registrations
  async getMyRegistrations() {
    return await api.get('/api/registrations/my', {
      requiresAuth: true,
    });
  },

  // Cancel a registration
  async cancelRegistration(registrationId) {
    return await apiRequest(
      `/api/registrations/${registrationId}/cancel`,
      {
        method: 'PATCH',
        requiresAuth: true,
      }
    );
  },

  // Get participants for an organizer's event
  async getEventParticipants(eventId) {
    return await api.get(
      `/api/registrations/event/${eventId}/participants`,
      {
        requiresAuth: true,
      }
    );
  },
};
