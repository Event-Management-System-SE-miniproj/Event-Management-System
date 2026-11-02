import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { registrationService } from '../services/registrationService';
import { eventService } from '../services/eventService';
import TicketModal from '../components/TicketModal';
import PaymentModal from '../components/PaymentModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import EventCard from '../components/EventCard';
import './UserDashboard.css';

export default function UserDashboard() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const { success, error, info } = useToast();

  const [registrations, setRegistrations] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  const [selectedPaymentReg, setSelectedPaymentReg] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const [cancellingRegId, setCancellingRegId] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const loadData = async () => {
    if (!user || !user.id) return;
    try {
      setLoading(true);
      const [regRes, eventRes] = await Promise.all([
        registrationService.getUserRegistrations(user.id),
        eventService.getEvents({ registration_open: 'true' }),
      ]);

      setRegistrations(regRes?.registrations || []);
      setAvailableEvents(eventRes?.events ? eventRes.events.slice(0, 3) : []);
    } catch (err) {
      console.error('Failed to load user dashboard data:', err);
      error(err.message || 'Unable to load dashboard records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleOpenTicket = async (reg) => {
    try {
      const res = await registrationService.getTicket(reg.id);
      setSelectedTicket(res?.ticket || {
        ...reg,
        registration_id: reg.id,
        attendee_name: user?.name,
      });
      setTicketModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch ticket:', err);
      // Fallback to reg data
      setSelectedTicket({
        ...reg,
        registration_id: reg.id,
        attendee_name: user?.name,
      });
      setTicketModalOpen(true);
    }
  };

  const handleOpenPayment = (reg) => {
    setSelectedPaymentReg({
      ...reg,
      event: { title: reg.event_title, venue: reg.venue },
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    success('Payment confirmed! Ticket is now available.');
    loadData();
  };

  const handleConfirmCancel = async () => {
    if (!cancellingRegId) return;
    try {
      await registrationService.cancelRegistration(cancellingRegId);
      success('Registration cancelled successfully.');
      setCancelModalOpen(false);
      setCancellingRegId(null);
      loadData();
    } catch (err) {
      error(err.message || 'Failed to cancel registration.');
    }
  };

  const activeRegistrations = registrations.filter((r) => r.status === 'REGISTERED');
  const validTickets = registrations.filter((r) => r.status === 'REGISTERED' && r.ticket_code);

  return (
    <div className="dashboard-container">
      {/* Welcome Section */}
      <section className="dashboard-welcome-banner">
        <div className="welcome-text">
          <h1>Welcome back, {user?.name || 'Attendee'}!</h1>
          <p>
            Attendee Dashboard &bull; Track registrations, view digital admission tickets, and explore events.
          </p>
        </div>
        <div className="welcome-actions">
          <button className="btn btn-outline" onClick={() => navigate('/profile')}>
            Edit Profile
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/events')}>
            Discover Events &rarr;
          </button>
        </div>
      </section>

      {/* KPI Stats */}
      <section className="dashboard-kpi-grid">
        <div className="dashboard-kpi-card">
          <span className="dashboard-kpi-val">{activeRegistrations.length}</span>
          <span className="dashboard-kpi-label">Active Registrations</span>
        </div>
        <div className="dashboard-kpi-card">
          <span className="dashboard-kpi-val">{validTickets.length}</span>
          <span className="dashboard-kpi-label">Issued Admission Tickets</span>
        </div>
        <div className="dashboard-kpi-card">
          <span className="dashboard-kpi-val">{availableEvents.length}</span>
          <span className="dashboard-kpi-label">Open Campus Events</span>
        </div>
      </section>

      {/* Registrations & Tickets Table */}
      <section className="registrations-card glass-panel">
        <div className="dashboard-section-header">
          <div>
            <h2>My Registrations &amp; Tickets</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Official admission passes for registered campus symposiums and events
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Retrieving your registrations...</p>
          </div>
        ) : registrations.length === 0 ? (
          <div className="dashboard-empty-card">
            <h3>No Event Registrations Found</h3>
            <p>You have not registered for any upcoming events yet.</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/events')}>
              Browse &amp; Register for Events
            </button>
          </div>
        ) : (
          <div className="registrations-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Date &amp; Time</th>
                  <th>Venue</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Ticket</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => {
                  const isRegistered = reg.status === 'REGISTERED';
                  const formattedDate = reg.event_date
                    ? new Date(reg.event_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'TBD';

                  return (
                    <tr key={reg.id}>
                      <td>
                        <strong>{reg.event_title}</strong>
                      </td>
                      <td>
                        {formattedDate} {reg.event_time ? `at ${reg.event_time.slice(0, 5)}` : ''}
                      </td>
                      <td>{reg.venue}</td>
                      <td>
                        <span
                          className={`badge ${
                            isRegistered ? 'badge-success' : 'badge-danger'
                          }`}
                        >
                          {reg.status}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            reg.payment_status === 'SUCCESS' ? 'badge-primary' : 'badge-warning'
                          }`}
                        >
                          {reg.payment_status || 'Free / Confirmed'}
                        </span>
                      </td>
                      <td>
                        {reg.ticket_code ? (
                          <code>{reg.ticket_code}</code>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>None</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons-cell">
                          {isRegistered && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleOpenTicket(reg)}
                              >
                                View Ticket
                              </button>
                              {reg.payment_status !== 'SUCCESS' && (
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => handleOpenPayment(reg)}
                                >
                                  Pay Fee
                                </button>
                              )}
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => {
                                  setCancellingRegId(reg.id);
                                  setCancelModalOpen(true);
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {!isRegistered && (
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.825rem' }}>
                              Registration Closed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Available / Recommended Events Section */}
      <section>
        <div className="dashboard-section-header">
          <div>
            <h2>Recommended Events For You</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Events with open registration seats available right now
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/events')}>
            View All &rarr;
          </button>
        </div>

        <div className="events-grid">
          {availableEvents.map((evt) => (
            <EventCard key={evt.id} event={evt} />
          ))}
        </div>
      </section>

      {/* Ticket Modal */}
      <TicketModal
        isOpen={ticketModalOpen}
        ticket={selectedTicket}
        onClose={() => setTicketModalOpen(false)}
      />

      {/* Payment Modal */}
      {selectedPaymentReg && (
        <PaymentModal
          isOpen={paymentModalOpen}
          registration={selectedPaymentReg}
          event={selectedPaymentReg.event}
          onClose={() => setPaymentModalOpen(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Registration Cancellation Modal */}
      <DeleteConfirmModal
        isOpen={cancelModalOpen}
        title="Cancel Event Registration"
        message="Are you sure you want to cancel your seat for this event? Your ticket will be invalidated and your seat made available to other attendees."
        confirmText="Confirm Cancellation"
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setCancelModalOpen(false);
          setCancellingRegId(null);
        }}
      />
    </div>
  );
}

