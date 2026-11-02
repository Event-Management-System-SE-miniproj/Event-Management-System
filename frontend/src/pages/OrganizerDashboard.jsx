import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { eventService } from '../services/eventService';
import ParticipantsModal from '../components/ParticipantsModal';
import EventReportModal from '../components/EventReportModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import './OrganizerDashboard.css';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const { success, error } = useToast();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedEventForParticipants, setSelectedEventForParticipants] = useState(null);
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);

  const [selectedEventForReport, setSelectedEventForReport] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const [deletingEvent, setDeletingEvent] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const loadOrganizerEvents = async () => {
    if (!user || !user.id) return;
    try {
      setLoading(true);
      let myEvents = []; try { const res = await eventService.getMyEvents(); myEvents = res?.events || []; } catch(e) { const res = await eventService.getEvents(); myEvents = (res?.events || []).filter(e => Number(e.organizer_id) === Number(user?.id)); } setEvents(myEvents);
    } catch (err) {
      console.error('Failed to load organizer events:', err);
      error(err.message || 'Unable to retrieve your managed events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizerEvents();
  }, [user]);

  const handleDeleteEvent = async () => {
    if (!deletingEvent || !user?.id) return;
    try {
      await eventService.deleteEvent(deletingEvent.id, user.id);
      success(`Event "${deletingEvent.title}" deleted successfully.`);
      setDeleteModalOpen(false);
      setDeletingEvent(null);
      loadOrganizerEvents();
    } catch (err) {
      error(err.message || 'Failed to delete event.');
    }
  };

  const handleToggleRegistration = async (event) => {
    try {
      const newStatus = !event.registration_open;
      await eventService.updateEvent(event.id, {
        organizer_id: user.id,
        title: event.title,
        description: event.description,
        event_date: event.event_date ? event.event_date.slice(0, 10) : '2026-12-01',
        event_time: event.event_time ? event.event_time.slice(0, 5) : '10:00',
        venue: event.venue,
        capacity: event.capacity,
        registration_open: newStatus,
      });

      success(`Registration is now ${newStatus ? 'OPEN' : 'CLOSED'} for this event.`);
      loadOrganizerEvents();
    } catch (err) {
      error(err.message || 'Failed to update registration status.');
    }
  };

  // Compute metrics
  const totalEvents = events.length;
  const totalCapacity = events.reduce((sum, e) => sum + (Number(e.capacity) || 0), 0);
  const totalRegistered = events.reduce((sum, e) => sum + (Number(e.registered_count) || 0), 0);
  const avgOccupancy = totalCapacity > 0 ? Math.round((totalRegistered / totalCapacity) * 100) : 0;

  return (
    <div className="organizer-container">
      {/* Banner */}
      <section className="organizer-header-banner">
        <div className="organizer-header-text">
          <h1>Organizer Command Center</h1>
          <p>
            Manage your campus symposiums, track live ticket rosters, and audit event capacity.
          </p>
        </div>
        <div>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/events/create')}>
            + Host New Event
          </button>
        </div>
      </section>

      {/* KPI Stats */}
      <section className="organizer-kpi-grid">
        <div className="organizer-kpi-card">
          <span className="organizer-kpi-val">{totalEvents}</span>
          <span className="organizer-kpi-label">Events Managed</span>
        </div>
        <div className="organizer-kpi-card">
          <span className="organizer-kpi-val">{totalRegistered}</span>
          <span className="organizer-kpi-label">Registered Attendees</span>
        </div>
        <div className="organizer-kpi-card">
          <span className="organizer-kpi-val">{totalCapacity}</span>
          <span className="organizer-kpi-label">Total Seat Capacity</span>
        </div>
        <div className="organizer-kpi-card">
          <span className="organizer-kpi-val">{avgOccupancy}%</span>
          <span className="organizer-kpi-label">Capacity Utilization</span>
        </div>
      </section>

      {/* Managed Events List */}
      <section className="organizer-events-card glass-panel">
        <div className="dashboard-section-header">
          <div>
            <h2>My Created Events</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Events created by {user?.name || user?.email} (Organizer ID: #{user?.id})
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={loadOrganizerEvents}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Loading your hosted events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="dashboard-empty-card">
            <h3>No Events Hosted Yet</h3>
            <p>You have not organized any events in the system yet.</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/events/create')}>
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="registrations-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Title</th>
                  <th>Date &amp; Time</th>
                  <th>Venue</th>
                  <th>Capacity &amp; Occupancy</th>
                  <th>Registration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => {
                  const regCount = Number(evt.registered_count) || 0;
                  const capacity = Number(evt.capacity) || 1;
                  const percent = Math.min(100, Math.round((regCount / capacity) * 100));
                  const formattedDate = evt.event_date
                    ? new Date(evt.event_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'TBD';

                  return (
                    <tr key={evt.id}>
                      <td>
                        <strong>{evt.title}</strong>
                      </td>
                      <td>
                        {formattedDate} {evt.event_time ? `at ${evt.event_time.slice(0, 5)}` : ''}
                      </td>
                      <td>{evt.venue}</td>
                      <td>
                        <div className="capacity-cell-wrapper">
                          <span className="capacity-mini-text">
                            {regCount} / {capacity} seats ({percent}%)
                          </span>
                          <div className="capacity-mini-bar-bg">
                            <div
                              className="capacity-mini-bar-fill"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`badge ${
                            evt.registration_open ? 'badge-success' : 'badge-danger'
                          }`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          title="Click to toggle registration state"
                          onClick={() => handleToggleRegistration(evt)}
                        >
                          {evt.registration_open ? 'Open (Click to Close)' : 'Closed (Click to Open)'}
                        </button>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            evt.status === 'ACTIVE' || !evt.status
                              ? 'badge-primary'
                              : 'badge-warning'
                          }`}
                        >
                          {evt.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-cell">
                          <button
                            className="btn btn-outline btn-sm"
                            title="View registered attendees"
                            onClick={() => {
                              setSelectedEventForParticipants(evt);
                              setParticipantsModalOpen(true);
                            }}
                          >
                            Participants
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            title="Lifecycle Report"
                            onClick={() => {
                              setSelectedEventForReport(evt);
                              setReportModalOpen(true);
                            }}
                          >
                            Report
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => navigate(`/events/${evt.id}/edit`)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => {
                              setDeletingEvent(evt);
                              setDeleteModalOpen(true);
                            }}
                          >
                            Delete
                          </button>
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

      {/* Participants Modal */}
      {selectedEventForParticipants && (
        <ParticipantsModal
          isOpen={participantsModalOpen}
          event={selectedEventForParticipants}
          onClose={() => {
            setParticipantsModalOpen(false);
            setSelectedEventForParticipants(null);
          }}
        />
      )}

      {/* Event Report Modal */}
      {selectedEventForReport && (
        <EventReportModal
          isOpen={reportModalOpen}
          event={selectedEventForReport}
          onClose={() => {
            setReportModalOpen(false);
            setSelectedEventForReport(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Hosted Event"
        message={
          deletingEvent
            ? `Are you sure you want to delete "${deletingEvent.title}"? This will cancel all attendee registrations.`
            : 'Are you sure you want to delete this event?'
        }
        confirmText="Confirm Delete"
        onConfirm={handleDeleteEvent}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeletingEvent(null);
        }}
      />
    </div>
  );
}


