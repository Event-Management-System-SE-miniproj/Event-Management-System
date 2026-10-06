import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { eventService } from '../services/eventService';
import { useToast } from '../context/ToastContext';
import './EventDetails.css';

export default function EventDetails({ id }) {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { success, error, warning } = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    async function loadDetails() {
      // Validate that ID is provided and numeric
      if (!id || isNaN(Number(id))) {
        setErrorMessage('Invalid Event ID requested.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);
        const res = await eventService.getEventById(id);
        if (res && res.event) {
          setEvent(res.event);
        } else {
          setErrorMessage('Event not found.');
        }
      } catch (err) {
        if (err.status === 404) {
          setErrorMessage('This event does not exist or may have been deleted.');
        } else {
          setErrorMessage(err.message || 'Failed to fetch event details.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadDetails();
  }, [id]);

  const handleRegister = async () => {
    if (!isAuthenticated) {
      warning('You must be logged in to register for an event.');
      navigate('/login');
      return;
    }

    if (!user || !user.id) {
      error('User session could not be verified. Please re-login.');
      return;
    }

    try {
      setRegistering(true);
      const res = await eventService.registerForEvent(event.id, user.id);
      setIsRegistered(true);
      success(res?.message || 'Registration successful! Your seat is confirmed.');
    } catch (err) {
      const msg = err.message || 'Registration could not be completed.';
      if (err.status === 409) {
        setIsRegistered(true);
        warning(msg);
      } else {
        error(msg);
      }
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="event-details-loading glass-panel">
        <div className="spinner"></div>
        <p>Loading event information...</p>
      </div>
    );
  }

  if (errorMessage || !event) {
    return (
      <div className="event-details-error glass-panel">
        <h2>Event Unavailable</h2>
        <p>{errorMessage || 'The requested event could not be found.'}</p>
        <button className="btn btn-primary" onClick={() => navigate('/events')}>
          &larr; Back to Events
        </button>
      </div>
    );
  }

  const isOrganizer = user && (user.id === event.organizer_id || user.role === 'ADMIN');
  const isRegistrationOpen = event.registration_open !== false;

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBD';

  const formattedTime = event.event_time ? event.event_time.slice(0, 5) : 'Time TBD';

  return (
    <div className="event-details-container">
      <button className="btn btn-outline btn-sm back-btn" onClick={() => navigate('/events')}>
        &larr; Back to Events
      </button>

      <div className="event-details-grid">
        {/* Main Content Info */}
        <div className="event-main-card glass-panel">
          <div className="event-main-header">
            <div className="event-date-pill">
              {formattedDate}
            </div>
            {isRegistrationOpen ? (
              <span className="badge badge-success">Registration Open</span>
            ) : (
              <span className="badge badge-danger">Registration Closed</span>
            )}
          </div>

          <h1 className="event-title">{event.title}</h1>

          <div className="event-description-section">
            <h3>About This Event</h3>
            <p className="event-desc-full">
              {event.description || 'No detailed description has been provided for this event.'}
            </p>
          </div>

          {/* Organizer Controls if current user is the event organizer */}
          {isOrganizer && (
            <div className="organizer-controls-panel">
              <div className="organizer-notice">
                <span>You are the organizer of this event.</span>
              </div>
              <div className="organizer-actions">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate(`/events/${event.id}/edit`)}
                >
                  Edit Event
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Registration / Details Card */}
        <div className="event-sidebar-card glass-panel">
          <h3>Event Overview</h3>

          <div className="sidebar-meta-list">
            <div className="sidebar-meta-item">
              <span className="meta-label">Venue</span>
              <span className="meta-value">{event.venue}</span>
            </div>
            <div className="sidebar-meta-item">
              <span className="meta-label">Time</span>
              <span className="meta-value">{formattedTime}</span>
            </div>
            <div className="sidebar-meta-item">
              <span className="meta-label">Capacity</span>
              <span className="meta-value">{event.capacity} seats</span>
            </div>
            <div className="sidebar-meta-item">
              <span className="meta-label">Event Status</span>
              <span className="meta-value">{event.status || 'ACTIVE'}</span>
            </div>
            {event.organizer_id && (
              <div className="sidebar-meta-item">
                <span className="meta-label">Organizer ID</span>
                <span className="meta-value">#{event.organizer_id}</span>
              </div>
            )}
          </div>

          <div className="registration-action-area">
            {isRegistered ? (
              <div className="registered-confirmation-badge">
                <span className="badge badge-success btn-block btn-lg registered-badge-text">
                  Registered for Event
                </span>
                <p className="registered-subtext">Your seat reservation is confirmed.</p>
              </div>
            ) : !isAuthenticated ? (
              <div className="auth-prompt-card">
                <p className="auth-prompt-text">Sign in with your EMS account to register for this event.</p>
                <div className="auth-prompt-buttons">
                  <button
                    className="btn btn-primary btn-block"
                    onClick={() => navigate('/login')}
                  >
                    Login to Register
                  </button>
                </div>
              </div>
            ) : !isRegistrationOpen ? (
              <div className="closed-prompt-card">
                <button className="btn btn-outline btn-block btn-lg" disabled>
                  Registration Closed
                </button>
                <p className="closed-subtext">The organizer has closed registration for this event.</p>
              </div>
            ) : (
              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={handleRegister}
                disabled={registering}
              >
                {registering ? 'Registering...' : 'Register for Event'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
