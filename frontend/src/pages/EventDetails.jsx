import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { eventService } from '../services/eventService';
import { useToast } from '../context/ToastContext';
import './EventDetails.css';

const formatEventDate = (value) => {
  if (!value) return 'Date to be announced';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date to be announced' : date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

export default function EventDetails({ id }) {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { success, error, warning } = useToast();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadDetails() {
      if (!id || !/^\d+$/.test(String(id))) {
        setErrorMessage('Invalid event ID.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setErrorMessage('');
        const response = await eventService.getEventById(id);
        if (!cancelled) {
          if (response?.event) setEvent(response.event);
          else setErrorMessage('This event could not be found.');
        }
      } catch (err) {
        if (!cancelled) setErrorMessage(err.status === 404 ? 'This event does not exist or may have been removed.' : (err.message || 'Unable to load event details.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDetails();
    return () => { cancelled = true; };
  }, [id]);

  const handleRegister = async () => {
    if (!isAuthenticated) {
      warning('Please log in before registering for this event.');
      navigate('/login');
      return;
    }
    if (!user?.id) {
      error('Your session could not be verified. Please sign in again.');
      navigate('/login');
      return;
    }
    if (user.role === 'ORGANIZER' && String(event.organizer_id) === String(user.id)) {
      warning('You cannot register for an event that you organize.');
      return;
    }
    try {
      setRegistering(true);
      const response = await eventService.registerForEvent(event.id, user.id);
      setIsRegistered(true);
      success(response?.message || 'Your registration request was submitted.');
    } catch (err) {
      if (err.status === 409) {
        setIsRegistered(true);
        warning(err.message || 'You are already registered for this event.');
      } else error(err.message || 'Registration could not be completed.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return <div className="event-details-loading glass-panel"><div className="spinner" /><p>Loading event information…</p></div>;
  if (errorMessage || !event) return <div className="event-details-error glass-panel"><h2>Event unavailable</h2><p>{errorMessage || 'The requested event could not be found.'}</p><button className="btn btn-primary" onClick={() => navigate('/events')}>← Back to events</button></div>;

  const isOrganizer = user && (String(user.id) === String(event.organizer_id) || user.role === 'ADMIN');
  const isRegistrationOpen = event.registration_open !== false && String(event.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
  const formattedTime = event.event_time ? String(event.event_time).slice(0, 5) : 'Time to be announced';

  return (
    <div className="event-details-container">
      <button className="btn btn-outline btn-sm back-btn" onClick={() => navigate('/events')}>← Back to events</button>
      <div className="event-details-grid">
        <section className="event-main-card glass-panel">
          <div className="event-main-header"><span className="event-date-pill">{formatEventDate(event.event_date)}</span><span className={isRegistrationOpen ? 'badge badge-success' : 'badge badge-danger'}>{isRegistrationOpen ? 'Registration open' : 'Registration closed'}</span></div>
          <h1 className="event-title">{event.title || 'Untitled event'}</h1>
          <div className="event-description-section"><h3>About this event</h3><p className="event-desc-full">{event.description || 'The organizer has not added a description yet.'}</p></div>
          {isOrganizer && <div className="organizer-controls-panel"><div className="organizer-notice"><span>You have organizer access for this event.</span></div><div className="organizer-actions"><button className="btn btn-outline btn-sm" onClick={() => navigate(`/events/${event.id}/edit`)}>Edit event</button><button className="btn btn-outline btn-sm" onClick={() => navigate('/organizer')}>Open dashboard</button></div></div>}
        </section>
        <aside className="event-sidebar-card glass-panel">
          <h3>Event overview</h3>
          <div className="sidebar-meta-list">
            <div className="sidebar-meta-item"><span className="meta-label">Venue</span><span className="meta-value">{event.venue || 'To be announced'}</span></div>
            <div className="sidebar-meta-item"><span className="meta-label">Time</span><span className="meta-value">{formattedTime}</span></div>
            <div className="sidebar-meta-item"><span className="meta-label">Capacity</span><span className="meta-value">{event.capacity ?? 'Not specified'} seats</span></div>
            <div className="sidebar-meta-item"><span className="meta-label">Event status</span><span className="meta-value">{String(event.status || 'ACTIVE').replaceAll('_', ' ')}</span></div>
            {event.participant_count !== undefined && <div className="sidebar-meta-item"><span className="meta-label">Registered attendees</span><span className="meta-value">{event.participant_count}</span></div>}
          </div>
          <div className="registration-action-area">
            {isOrganizer ? <div className="auth-prompt-card"><p className="auth-prompt-text">You are viewing this event as an organizer.</p><button className="btn btn-primary btn-block" onClick={() => navigate(`/events/${event.id}/edit`)}>Manage event</button></div> :
              isRegistered ? <div className="registered-confirmation-badge"><span className="badge badge-success btn-block btn-lg registered-badge-text">Registration submitted</span><p className="registered-subtext">Your registration request has been recorded. Check your profile for registration details.</p></div> :
              !isAuthenticated ? <div className="auth-prompt-card"><p className="auth-prompt-text">Sign in to your account to register for this event.</p><button className="btn btn-primary btn-block" onClick={() => navigate('/login')}>Login to register</button></div> :
              !isRegistrationOpen ? <div className="closed-prompt-card"><button className="btn btn-outline btn-block btn-lg" disabled>Registration closed</button><p className="closed-subtext">The organizer is not accepting registrations at the moment.</p></div> :
              <button className="btn btn-primary btn-block btn-lg" onClick={handleRegister} disabled={registering}>{registering ? 'Submitting…' : 'Register for event'}</button>}
          </div>
          <p className="event-registration-note">Registration confirmation and any further instructions will be shown after the request is processed.</p>
        </aside>
      </div>
    </div>
  );
}
