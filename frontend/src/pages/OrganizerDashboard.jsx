import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { eventService } from '../services/eventService';
import './OrganizerDashboard.css';

const formatDate = (value) => {
  if (!value) return 'Date to be announced';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date to be announced' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
const statusLabel = (event) => event.status ? String(event.status).replaceAll('_', ' ') : (event.registration_open === false ? 'REGISTRATION CLOSED' : 'ACTIVE');

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadEvents = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const response = await eventService.getEvents();
      const allEvents = Array.isArray(response?.events) ? response.events : [];
      setEvents(allEvents.filter((event) => String(event.organizer_id) === String(user.id)));
    } catch (err) {
      setError(err.message || 'Unable to load your events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const visibleEvents = useMemo(() => events.filter((event) => {
    const matchesSearch = [event.title, event.venue, event.description].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase().trim()));
    const active = String(event.status || 'ACTIVE').toUpperCase() === 'ACTIVE' && event.registration_open !== false;
    return matchesSearch && (statusFilter === 'all' || (statusFilter === 'open' ? active : !active));
  }), [events, search, statusFilter]);

  const totalParticipants = events.reduce((sum, event) => sum + Number(event.participant_count || 0), 0);
  const openEvents = events.filter((event) => event.registration_open !== false && String(event.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
  const closedEvents = events.length - openEvents;

  const loadParticipants = async (event) => {
    setSelectedEvent(event);
    setParticipants([]);
    setParticipantsLoading(true);
    setActiveTab('participants');
    try {
      const response = await eventService.getEventParticipants(event.id);
      setParticipants(Array.isArray(response?.participants) ? response.participants : []);
    } catch (err) {
      showError(err.message || 'Unable to load participants.');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleDelete = async (event) => {
    if (!window.confirm(`Delete "${event.title}"? This action cannot be undone.`)) return;
    try {
      await eventService.deleteEvent(event.id, user.id);
      success('Event deleted successfully.');
      if (selectedEvent?.id === event.id) {
        setSelectedEvent(null);
        setParticipants([]);
        setActiveTab('events');
      }
      await loadEvents();
    } catch (err) {
      showError(err.message || 'Unable to delete this event.');
    }
  };

  return (
    <main className="organizer-dashboard">
      <header className="organizer-heading">
        <div><p className="eyebrow">EVENT MANAGEMENT</p><h1>Organizer dashboard</h1><p className="organizer-intro">Welcome back, {user?.name || 'Organizer'}. Manage your events and keep track of attendees.</p></div>
        <button className="btn btn-primary" onClick={() => navigate('/events/create')}>＋ Create event</button>
      </header>
      <section className="organizer-stats" aria-label="Event overview">
        <article className="organizer-stat glass-panel"><span>Total events</span><strong>{events.length}</strong><small>Events created by you</small></article>
        <article className="organizer-stat glass-panel"><span>Registration open</span><strong>{openEvents}</strong><small>Accepting attendees</small></article>
        <article className="organizer-stat glass-panel"><span>Participants</span><strong>{totalParticipants}</strong><small>Across your events</small></article>
        <article className="organizer-stat glass-panel"><span>Closed / inactive</span><strong>{closedEvents}</strong><small>Not accepting registrations</small></article>
      </section>
      <section className="organizer-workspace glass-panel">
        <div className="organizer-tabs" role="tablist" aria-label="Organizer sections">
          <button role="tab" aria-selected={activeTab === 'events'} className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>My events</button>
          <button role="tab" aria-selected={activeTab === 'participants'} className={activeTab === 'participants' ? 'active' : ''} disabled={!selectedEvent} onClick={() => setActiveTab('participants')}>Participants{selectedEvent ? ` · ${selectedEvent.title}` : ''}</button>
          <button className="organizer-refresh" onClick={loadEvents} disabled={loading}>{loading ? 'Refreshing…' : '↻ Refresh'}</button>
        </div>
        {error && <div className="organizer-alert" role="alert"><span>{error}</span><button onClick={loadEvents}>Try again</button></div>}
        {activeTab === 'events' && <div className="organizer-content">
          <div className="organizer-list-heading"><div><h2>Your events</h2><p>Review, update, and manage the events you have created.</p></div></div>
          <div className="organizer-filters">
            <label className="organizer-search"><span className="sr-only">Search your events</span><input className="form-control" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by event, venue, or description" /></label>
            <select className="form-control" aria-label="Filter events by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="open">Registration open</option><option value="closed">Closed / inactive</option></select>
          </div>
          {loading ? <div className="organizer-empty"><span className="spinner" /><p>Loading your events…</p></div> :
            visibleEvents.length === 0 ? <div className="organizer-empty"><span className="organizer-empty-icon">▤</span><h3>{events.length ? 'No matching events' : 'Your event space is ready'}</h3><p>{events.length ? 'Try changing your search or status filter.' : 'Create your first event and it will appear here.'}</p>{!events.length && <button className="btn btn-primary" onClick={() => navigate('/events/create')}>Create your first event</button>}</div> :
            <div className="organizer-event-list">{visibleEvents.map((event) => {
              const active = event.registration_open !== false && String(event.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
              return <article className="organizer-event-row" key={event.id}>
                <div className="organizer-event-date"><strong>{event.event_date ? new Date(event.event_date).toLocaleDateString(undefined, { day: '2-digit' }) : '—'}</strong><span>{event.event_date ? new Date(event.event_date).toLocaleDateString(undefined, { month: 'short' }) : 'TBD'}</span></div>
                <div className="organizer-event-main"><div className="organizer-event-title-line"><h3>{event.title || 'Untitled event'}</h3><span className={active ? 'organizer-status is-open' : 'organizer-status is-closed'}>{active ? 'Registration open' : statusLabel(event)}</span></div><p>{event.venue || 'Venue to be announced'} · {formatDate(event.event_date)}</p><small>{Number(event.participant_count || 0)} participants · Capacity {event.capacity ?? '—'}</small></div>
                <div className="organizer-event-actions"><button className="btn btn-outline btn-sm" onClick={() => navigate(`/events/${event.id}`)}>View</button><button className="btn btn-outline btn-sm" onClick={() => navigate(`/events/${event.id}/edit`)}>Edit</button><button className="btn btn-outline btn-sm" onClick={() => loadParticipants(event)}>Attendees</button><button className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(event)}>Delete</button></div>
              </article>;
            })}</div>}
        </div>}
        {activeTab === 'participants' && <div className="organizer-content">
          <div className="organizer-list-heading"><div><h2>Participants</h2><p>{selectedEvent ? `Registrations for ${selectedEvent.title}` : 'Select an event to view attendees.'}</p></div>{selectedEvent && <button className="btn btn-outline btn-sm" onClick={() => navigate(`/events/${selectedEvent.id}`)}>View event</button>}</div>
          {participantsLoading ? <div className="organizer-empty"><span className="spinner" /><p>Loading participants…</p></div> : participants.length === 0 ? <div className="organizer-empty"><h3>No participants to show</h3><p>There are no participant records available for this event yet.</p></div> :
            <div className="organizer-table-wrap"><table className="organizer-table"><thead><tr><th>Name</th><th>Email</th><th>Registration status</th><th>Registered</th></tr></thead><tbody>{participants.map((participant) => <tr key={participant.registration_id}><td>{participant.participant_name || '—'}</td><td>{participant.participant_email || '—'}</td><td><span className="organizer-status">{String(participant.registration_status || 'UNKNOWN').replaceAll('_', ' ')}</span></td><td>{participant.registered_at ? new Date(participant.registered_at).toLocaleString() : '—'}</td></tr>)}</tbody></table></div>}
        </div>}
      </section>
    </main>
  );
}
