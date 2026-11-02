import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { eventService } from '../services/eventService';
import { registrationService } from '../services/registrationService';
import { useToast } from '../context/ToastContext';
import TicketModal from '../components/TicketModal';
import PaymentModal from '../components/PaymentModal';
import './EventDetails.css';

export default function EventDetails({ id }) {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { success, error, warning, info } = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [userRegistration, setUserRegistration] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Modals
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  useEffect(() => {
    async function loadDetails() {
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

          // If user logged in, check if already registered
          if (user?.id) {
            try {
              const regRes = await registrationService.getUserRegistrations(user.id);
              const found = (regRes?.registrations || []).find(
                (r) => Number(r.event_id) === Number(id) && r.status === 'REGISTERED'
              );
              if (found) {
                setUserRegistration(found);
                setTicketData(found);
              }
            } catch (e) {
              console.warn('Could not check user registration status:', e.message);
            }
          }
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
  }, [id, user]);

  const handleRegister = async () => {
    if (!isAuthenticated) {
      warning('You must be logged in to register for an event.');
      navigate('/login');
      return;
    }

    if (!user || !user.id) {
      error('User session could not be verified. Please log in again.');
      return;
    }

    try {
      setRegistering(true);
      const res = await registrationService.registerForEvent(event.id, user.id);
      const newReg = res.registration;
      const newTicket = res.ticket;

      const fullTicketInfo = {
        ...event,
        ...newReg,
        ...newTicket,
        registration_id: newReg.id,
        event_title: event.title,
        attendee_name: user.name,
        attendee_email: user.email,
      };

      setUserRegistration(newReg);
      setTicketData(fullTicketInfo);
      success(res?.message || 'Registration confirmed! Your seat is reserved.');

      // Refresh event details to reflect updated registered_count
      const updatedEventRes = await eventService.getEventById(event.id);
      if (updatedEventRes?.event) {
        setEvent(updatedEventRes.event);
      }

      // Automatically offer payment/ticket
      setPaymentModalOpen(true);
    } catch (err) {
      const msg = err.message || 'Registration could not be completed.';
      if (err.status === 409) {
        warning(msg);
        // reload registration
        try {
          const regRes = await registrationService.getUserRegistrations(user.id);
          const found = (regRes?.registrations || []).find(
            (r) => Number(r.event_id) === Number(id)
          );
          if (found) {
            setUserRegistration(found);
            setTicketData(found);
          }
        } catch (_) {}
      } else {
        error(msg);
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleOpenTicket = async () => {
    if (userRegistration?.id) {
      try {
        const res = await registrationService.getTicket(userRegistration.id);
        if (res?.ticket) {
          setTicketData({
            ...res.ticket,
            attendee_name: user?.name,
            attendee_email: user?.email,
          });
        }
      } catch (e) {
        // fallback to ticketData
      }
    }
    setTicketModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    success('Payment successful! Your admission ticket is ready.');
    setTicketModalOpen(true);
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
  const registeredCount = Number(event.registered_count) || 0;
  const capacity = Number(event.capacity) || 1;
  const isFull = registeredCount >= capacity;
  const isRegistered = Boolean(userRegistration && userRegistration.status === 'REGISTERED');

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
            <div className="event-date-pill">{formattedDate}</div>
            <div>
              {isFull ? (
                <span className="badge badge-danger">Capacity Reached (Full)</span>
              ) : isRegistrationOpen ? (
                <span className="badge badge-success">Registration Open</span>
              ) : (
                <span className="badge badge-danger">Registration Closed</span>
              )}
            </div>
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
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginLeft: '8px' }}
                  onClick={() => navigate('/organizer')}
                >
                  Organizer Hub
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
              <span className="meta-label">Seat Availability</span>
              <span className="meta-value">
                <strong>{registeredCount}</strong> / {capacity} seats registered
              </span>
            </div>
            <div className="sidebar-meta-item">
              <span className="meta-label">Event Status</span>
              <span className="meta-value">{event.status || 'ACTIVE'}</span>
            </div>
            <div className="sidebar-meta-item">
              <span className="meta-label">Registration Fee</span>
              <span className="meta-value" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                $25.00
              </span>
            </div>
          </div>

          <div className="registration-action-area">
            {isRegistered ? (
              <div className="registered-confirmation-badge">
                <span className="badge badge-success btn-block btn-lg registered-badge-text" style={{ padding: '10px' }}>
                  ✓ You Are Registered
                </span>
                <p className="registered-subtext" style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Your seat reservation is confirmed.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <button className="btn btn-primary btn-block" onClick={handleOpenTicket}>
                    View / Download Ticket
                  </button>
                  <button className="btn btn-outline btn-block" onClick={() => navigate('/dashboard')}>
                    Go to My Dashboard
                  </button>
                </div>
              </div>
            ) : !isAuthenticated ? (
              <div className="auth-prompt-card">
                <p className="auth-prompt-text">Sign in with your EMS account to register for this event.</p>
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => navigate('/login')}
                >
                  Login to Register
                </button>
              </div>
            ) : isFull ? (
              <div className="closed-prompt-card">
                <button className="btn btn-outline btn-block btn-lg" disabled>
                  Event Full (Capacity Reached)
                </button>
                <p className="closed-subtext" style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--danger)' }}>
                  All {capacity} seats have been reserved.
                </p>
              </div>
            ) : !isRegistrationOpen ? (
              <div className="closed-prompt-card">
                <button className="btn btn-outline btn-block btn-lg" disabled>
                  Registration Closed
                </button>
                <p className="closed-subtext" style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  The organizer has closed registration for this event.
                </p>
              </div>
            ) : (
              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={handleRegister}
                disabled={registering}
              >
                {registering ? 'Confirming Seat...' : 'Register for Event'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Modal */}
      {ticketData && (
        <TicketModal
          isOpen={ticketModalOpen}
          ticket={ticketData}
          onClose={() => setTicketModalOpen(false)}
        />
      )}

      {/* Payment Modal */}
      {userRegistration && (
        <PaymentModal
          isOpen={paymentModalOpen}
          registration={userRegistration}
          event={event}
          onClose={() => setPaymentModalOpen(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
