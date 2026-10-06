import React from 'react';
import { useRouter } from '../context/RouterContext';
import './EventCard.css';

export default function EventCard({ event, showActions = true }) {
  const { navigate } = useRouter();

  if (!event) return null;

  // Format date safely
  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBD';

  // Format time (strip seconds if format is HH:MM:SS)
  const formattedTime = event.event_time
    ? event.event_time.slice(0, 5)
    : 'Time TBD';

  const isRegistrationOpen = event.registration_open !== false;

  return (
    <div className="event-card glass-panel">
      <div className="event-card-header">
        <div className="event-date-badge">
          <span>{formattedDate}</span>
        </div>
        <div className="event-status-badge">
          {isRegistrationOpen ? (
            <span className="badge badge-success">Registration Open</span>
          ) : (
            <span className="badge badge-danger">Closed</span>
          )}
        </div>
      </div>

      <div className="event-card-body">
        <h3 className="event-card-title">{event.title}</h3>
        <p className="event-card-desc">
          {event.description
            ? event.description.length > 120
              ? `${event.description.slice(0, 120)}...`
              : event.description
            : 'No description provided for this event.'}
        </p>

        <div className="event-meta-info">
          <div className="event-meta-row">
            <span className="meta-label-tag">Venue:</span>
            <span className="meta-text">{event.venue}</span>
          </div>
          <div className="event-meta-row">
            <span className="meta-label-tag">Time:</span>
            <span className="meta-text">{formattedTime}</span>
          </div>
          <div className="event-meta-row">
            <span className="meta-label-tag">Capacity:</span>
            <span className="meta-text">{event.capacity} seats</span>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="event-card-footer">
          <button
            className="btn btn-primary btn-block"
            onClick={() => navigate(`/events/${event.id}`)}
          >
            View Details
          </button>
        </div>
      )}
    </div>
  );
}
