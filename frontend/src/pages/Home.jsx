import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, Link } from '../context/RouterContext';
import { eventService } from '../services/eventService';
import EventCard from '../components/EventCard';
import './Home.css';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const { navigate } = useRouter();

  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isOrganizer = user && (user.role === 'ORGANIZER' || user.role === 'ADMIN');

  useEffect(() => {
    async function fetchUpcoming() {
      try {
        setLoading(true);
        const res = await eventService.getEvents({ registration_open: 'true' });
        if (res && res.events) {
          // Take top 3 upcoming events
          setUpcomingEvents(res.events.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load upcoming events:', err.message);
        setError('Could not load featured events at this time.');
      } finally {
        setLoading(false);
      }
    }

    fetchUpcoming();
  }, []);

  return (
    <div className="home-page-container">
      {/* Hero Section */}
      <section className="hero-section glass-panel">
        <div className="hero-content">
          <h1 className="hero-title">
            Campus &amp; Professional <span className="text-gradient">Event Management System</span>
          </h1>
          <p className="hero-subtitle">
            A centralized platform for students, organizers, and attendees to discover campus events,
            reserve seats, and manage event lifecycles.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/events')}>
              Browse Events
            </button>
            {isAuthenticated && isOrganizer ? (
              <button className="btn btn-outline btn-lg" onClick={() => navigate('/events/create')}>
                Create Event
              </button>
            ) : (
              <button className="btn btn-outline btn-lg" onClick={() => navigate('/register')}>
                Register Account
              </button>
            )}
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="hero-features-grid">
          <div className="feature-item">
            <h4>Seat Registration</h4>
            <p>Direct registration with automated real-time capacity management.</p>
          </div>
          <div className="feature-item">
            <h4>Role-Based Access</h4>
            <p>Dedicated interfaces for attendees, organizers, and administrators.</p>
          </div>
          <div className="feature-item">
            <h4>Event Search</h4>
            <p>Filter by date, venue, keywords, and registration status.</p>
          </div>
        </div>
      </section>

      {/* Featured Upcoming Events Section */}
      <section className="featured-events-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Upcoming Events</h2>
            <p className="section-subtitle">Events currently open for registration</p>
          </div>
          <Link to="/events" className="btn btn-outline btn-sm">
            View All Events &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="loading-state glass-panel">
            <div className="spinner"></div>
            <p>Loading upcoming events...</p>
          </div>
        ) : error ? (
          <div className="error-state glass-panel">
            <p>{error}</p>
            <button className="btn btn-outline btn-sm" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="empty-state glass-panel">
            <p>No upcoming events currently open for registration.</p>
            {isOrganizer && (
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/events/create')}>
                Create First Event
              </button>
            )}
          </div>
        ) : (
          <div className="events-grid">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
