
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { eventService } from '../services/eventService';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const { success, error: showError } = useToast();

  const [events, setEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('events');
  const [error, setError] = useState('');

  const loadEvents = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await eventService.getEvents();
      const allEvents = response.events || [];

      const myEvents = allEvents.filter(
        (event) => String(event.organizer_id) === String(user.id)
      );

      setEvents(myEvents);
    } catch (err) {
      setError(err.message || 'Unable to load your events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user?.id]);

  const loadParticipants = async (event) => {
    setSelectedEvent(event);
    setParticipants([]);
    setParticipantsLoading(true);
    setActiveTab('participants');

    try {
      const response = await eventService.getEventParticipants(event.id);
      setParticipants(response.participants || []);
    } catch (err) {
      showError(err.message || 'Unable to load participants.');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleDelete = async (event) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${event.title}"?`
    );

    if (!confirmed) return;

    try {
      await eventService.deleteEvent(event.id, user.id);
      success('Event deleted successfully.');
      await loadEvents();
      setActiveTab('events');
      setSelectedEvent(null);
    } catch (err) {
      showError(err.message || 'Unable to delete event.');
    }
  };

  const totalParticipants = events.reduce(
    (total, event) => total + Number(event.participant_count || 0),
    0
  );

  const activeEvents = events.filter(
    (event) => event.status === 'ACTIVE'
  ).length;

  return (
    <main style={{ maxWidth: '1200px', margin: '30px auto', padding: '20px' }}>
      <h1>Organizer Dashboard</h1>
      <p>Welcome, {user?.name || 'Organizer'}!</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          margin: '25px 0',
        }}
      >
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3>Total Events</h3>
          <h2>{events.length}</h2>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3>Active Events</h3>
          <h2>{activeEvents}</h2>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3>Participants</h3>
          <h2>{totalParticipants}</h2>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button
          className={`btn ${activeTab === 'events' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('events')}
        >
          My Events
        </button>

        <button
          className={`btn ${activeTab === 'participants' ? 'btn-primary' : 'btn-outline'}`}
          disabled={!selectedEvent}
          onClick={() => setActiveTab('participants')}
        >
          Participants
        </button>

        <button
          className="btn btn-primary"
          onClick={() => navigate('/events/create')}
        >
          + Create Event
        </button>
      </div>

      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      {activeTab === 'events' && (
        <section>
          <h2>My Events</h2>

          {loading ? (
            <p>Loading your events...</p>
          ) : events.length === 0 ? (
            <p>You haven't created any events yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {events.map((event) => (
                <div
                  key={event.id}
                  className="glass-panel"
                  style={{ padding: '20px' }}
                >
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  <p><strong>Date:</strong> {event.event_date}</p>
                  <p><strong>Venue:</strong> {event.venue}</p>
                  <p><strong>Status:</strong> {event.status}</p>
                  <p>
                    <strong>Participants:</strong>{' '}
                    {event.participant_count ?? 0}
                  </p>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      View Details
                    </button>

                    <button
                      className="btn btn-outline"
                      onClick={() => navigate(`/events/${event.id}/edit`)}
                    >
                      Edit
                    </button>

                    <button
                      className="btn btn-outline"
                      onClick={() => loadParticipants(event)}
                    >
                      View Participants
                    </button>

                    <button
                      className="btn btn-outline"
                      onClick={() => handleDelete(event)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'participants' && (
        <section>
          <h2>
            Participants
            {selectedEvent ? ` - ${selectedEvent.title}` : ''}
          </h2>

          {participantsLoading ? (
            <p>Loading participants...</p>
          ) : participants.length === 0 ? (
            <p>No participants found for this event.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Registration Status</th>
                    <th>Registered At</th>
                  </tr>
                </thead>

                <tbody>
                  {participants.map((participant) => (
                    <tr key={participant.registration_id}>
                      <td>{participant.participant_name}</td>
                      <td>{participant.participant_email}</td>
                      <td>{participant.registration_status}</td>
                      <td>
                        {participant.registered_at
                          ? new Date(participant.registered_at).toLocaleString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
