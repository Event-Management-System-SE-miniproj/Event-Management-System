import React, { useState } from 'react';
import '../pages/EventForm.css';

export default function EventForm({
  initialData = {},
  onSubmit,
  onCancel,
  onDelete,
  isEditing = false,
  submitting = false,
  deleting = false,
  formTitle = 'Event Details',
  formSubtitle = 'Provide details for the event',
}) {
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [eventDate, setEventDate] = useState(
    initialData.event_date ? initialData.event_date.slice(0, 10) : ''
  );
  const [eventTime, setEventTime] = useState(
    initialData.event_time ? initialData.event_time.slice(0, 5) : ''
  );
  const [venue, setVenue] = useState(initialData.venue || '');
  const [capacity, setCapacity] = useState(initialData.capacity || '');
  const [registrationOpen, setRegistrationOpen] = useState(
    initialData.registration_open !== undefined ? initialData.registration_open : true
  );

  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    const trimmedTitle = title.trim();
    const trimmedVenue = venue.trim();

    if (!trimmedTitle) {
      errors.title = 'Event title is required.';
    }

    if (!eventDate) {
      errors.eventDate = 'Event date is required.';
    }

    if (!eventTime) {
      errors.eventTime = 'Event time is required.';
    }

    if (!trimmedVenue) {
      errors.venue = 'Venue / location is required.';
    }

    const numCapacity = Number(capacity);
    if (!capacity) {
      errors.capacity = 'Capacity is required.';
    } else if (isNaN(numCapacity) || numCapacity <= 0 || !Number.isInteger(numCapacity)) {
      errors.capacity = 'Capacity must be a positive whole integer greater than 0.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      event_date: eventDate,
      event_time: eventTime,
      venue: venue.trim(),
      capacity: Number(capacity),
      registration_open: registrationOpen,
    });
  };

  return (
    <div className="event-form-page">
      <div className="event-form-card glass-panel">
        <div className="form-page-header">
          <h2>{formTitle}</h2>
          <p>{formSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="event-form" noValidate>
          {/* Event Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="form-event-title">
              Event Title *
            </label>
            <input
              id="form-event-title"
              type="text"
              className={`form-control ${fieldErrors.title ? 'input-error' : ''}`}
              placeholder="e.g. Annual Campus Hackathon 2026"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) setFieldErrors({ ...fieldErrors, title: null });
              }}
            />
            {fieldErrors.title && <span className="field-error-text">{fieldErrors.title}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="form-event-desc">
              Description (Optional)
            </label>
            <textarea
              id="form-event-desc"
              className="form-control"
              rows={4}
              placeholder="Provide a comprehensive summary of the schedule, guidelines, and target audience..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Date & Time */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="form-event-date">
                Event Date *
              </label>
              <input
                id="form-event-date"
                type="date"
                className={`form-control ${fieldErrors.eventDate ? 'input-error' : ''}`}
                required
                value={eventDate}
                onChange={(e) => {
                  setEventDate(e.target.value);
                  if (fieldErrors.eventDate) setFieldErrors({ ...fieldErrors, eventDate: null });
                }}
              />
              {fieldErrors.eventDate && (
                <span className="field-error-text">{fieldErrors.eventDate}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="form-event-time">
                Event Time *
              </label>
              <input
                id="form-event-time"
                type="time"
                className={`form-control ${fieldErrors.eventTime ? 'input-error' : ''}`}
                required
                value={eventTime}
                onChange={(e) => {
                  setEventTime(e.target.value);
                  if (fieldErrors.eventTime) setFieldErrors({ ...fieldErrors, eventTime: null });
                }}
              />
              {fieldErrors.eventTime && (
                <span className="field-error-text">{fieldErrors.eventTime}</span>
              )}
            </div>
          </div>

          {/* Venue & Capacity */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="form-event-venue">
                Venue / Location *
              </label>
              <input
                id="form-event-venue"
                type="text"
                className={`form-control ${fieldErrors.venue ? 'input-error' : ''}`}
                placeholder="e.g. GJBC Auditorium"
                required
                value={venue}
                onChange={(e) => {
                  setVenue(e.target.value);
                  if (fieldErrors.venue) setFieldErrors({ ...fieldErrors, venue: null });
                }}
              />
              {fieldErrors.venue && <span className="field-error-text">{fieldErrors.venue}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="form-event-capacity">
                Capacity (Max Attendees) *
              </label>
              <input
                id="form-event-capacity"
                type="number"
                min={1}
                step={1}
                className={`form-control ${fieldErrors.capacity ? 'input-error' : ''}`}
                placeholder="e.g. 100"
                required
                value={capacity}
                onChange={(e) => {
                  setCapacity(e.target.value);
                  if (fieldErrors.capacity) setFieldErrors({ ...fieldErrors, capacity: null });
                }}
              />
              {fieldErrors.capacity && (
                <span className="field-error-text">{fieldErrors.capacity}</span>
              )}
            </div>
          </div>

          {/* Registration Open Toggle */}
          <div className="form-group checkbox-group">
            <label className="checkbox-label" htmlFor="form-reg-toggle">
              <input
                id="form-reg-toggle"
                type="checkbox"
                checked={registrationOpen}
                onChange={(e) => setRegistrationOpen(e.target.checked)}
              />
              <span>Registration is open for attendees</span>
            </label>
          </div>

          {/* Action Buttons */}
          {isEditing ? (
            <div className="form-actions-split">
              <button
                type="button"
                className="btn btn-danger-outline"
                onClick={onDelete}
                disabled={deleting || submitting}
              >
                {deleting ? 'Deleting...' : 'Delete Event'}
              </button>

              <div className="form-actions-right">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={onCancel}
                  disabled={submitting || deleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || deleting}
                >
                  {submitting ? 'Saving Updates...' : 'Save Updates'}
                </button>
              </div>
            </div>
          ) : (
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Publishing Event...' : 'Publish Event'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
