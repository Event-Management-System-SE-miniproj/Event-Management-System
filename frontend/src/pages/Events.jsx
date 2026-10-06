import React, { useEffect, useState, useCallback } from 'react';
import { eventService } from '../services/eventService';
import EventCard from '../components/EventCard';
import './Events.css';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter input state (user typing)
  const [searchInput, setSearchInput] = useState('');
  const [venueInput, setVenueInput] = useState('');
  const [eventDateInput, setEventDateInput] = useState('');
  const [registrationOpenInput, setRegistrationOpenInput] = useState('');

  // Active filters submitted to backend
  const [activeFilters, setActiveFilters] = useState({
    search: '',
    venue: '',
    event_date: '',
    registration_open: '',
  });

  const fetchEvents = useCallback(async (filters) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = {};
      if (filters.search && filters.search.trim()) queryParams.search = filters.search.trim();
      if (filters.venue && filters.venue.trim()) queryParams.venue = filters.venue.trim();
      if (filters.event_date) queryParams.event_date = filters.event_date;
      if (filters.registration_open !== '') queryParams.registration_open = filters.registration_open;

      const data = await eventService.getEvents(queryParams);
      setEvents(data?.events || []);
    } catch (err) {
      console.error('Failed to fetch events:', err.message);
      setError(err.message || 'Unable to connect to the server. Please verify the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch events when activeFilters change
  useEffect(() => {
    fetchEvents(activeFilters);
  }, [activeFilters, fetchEvents]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setActiveFilters({
      search: searchInput,
      venue: venueInput,
      event_date: eventDateInput,
      registration_open: registrationOpenInput,
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setVenueInput('');
    setEventDateInput('');
    setRegistrationOpenInput('');
    setActiveFilters({
      search: '',
      venue: '',
      event_date: '',
      registration_open: '',
    });
  };

  const hasActiveFilters = Boolean(
    activeFilters.search ||
    activeFilters.venue ||
    activeFilters.event_date ||
    activeFilters.registration_open
  );

  return (
    <div className="events-page-container">
      <div className="events-header">
        <h1 className="page-title">Explore Events</h1>
        <p className="page-subtitle">
          Search upcoming hackathons, symposiums, workshops, and campus meetups.
        </p>
      </div>

      {/* Filter and Search Form */}
      <form className="events-filter-card glass-panel" onSubmit={handleFilterSubmit}>
        <div className="filter-grid">
          {/* Keyword Search */}
          <div className="form-group filter-item-search">
            <label className="form-label" htmlFor="filter-search">
              Search Keywords
            </label>
            <input
              id="filter-search"
              type="text"
              className="form-control"
              placeholder="Title, description, or venue..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* Venue Filter */}
          <div className="form-group">
            <label className="form-label" htmlFor="filter-venue">
              Venue / Location
            </label>
            <input
              id="filter-venue"
              type="text"
              className="form-control"
              placeholder="e.g. Auditorium, Hall B..."
              value={venueInput}
              onChange={(e) => setVenueInput(e.target.value)}
            />
          </div>

          {/* Date Filter */}
          <div className="form-group">
            <label className="form-label" htmlFor="filter-date">
              Event Date
            </label>
            <input
              id="filter-date"
              type="date"
              className="form-control"
              value={eventDateInput}
              onChange={(e) => setEventDateInput(e.target.value)}
            />
          </div>

          {/* Registration Status Filter */}
          <div className="form-group">
            <label className="form-label" htmlFor="filter-status">
              Registration Status
            </label>
            <select
              id="filter-status"
              className="form-control"
              value={registrationOpenInput}
              onChange={(e) => setRegistrationOpenInput(e.target.value)}
            >
              <option value="">All Events</option>
              <option value="true">Registration Open</option>
              <option value="false">Registration Closed</option>
            </select>
          </div>
        </div>

        <div className="filter-actions">
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleClearFilters}
              disabled={loading}
            >
              Reset Filters
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Apply Filters'}
          </button>
        </div>
      </form>

      {/* Events Results Area */}
      <section className="events-results-section" aria-live="polite">
        {loading ? (
          <div className="loading-state glass-panel">
            <div className="spinner"></div>
            <p>Loading events matching your criteria...</p>
          </div>
        ) : error ? (
          <div className="error-state glass-panel">
            <p className="error-text">{error}</p>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => fetchEvents(activeFilters)}
            >
              Try Again
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state glass-panel">
            <h3>No Events Found</h3>
            <p>
              {hasActiveFilters
                ? 'No upcoming events match the current search filters. Try clearing your search parameters.'
                : 'There are currently no upcoming events scheduled on the platform.'}
            </p>
            {hasActiveFilters && (
              <button className="btn btn-outline btn-sm" onClick={handleClearFilters}>
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="results-count-bar">
              <span className="results-count">
                Showing <strong>{events.length}</strong> upcoming {events.length === 1 ? 'event' : 'events'}
              </span>
              {hasActiveFilters && (
                <span className="filter-active-pill">Filtered Results</span>
              )}
            </div>
            <div className="events-grid">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
