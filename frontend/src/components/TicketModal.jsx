import React from 'react';
import './TicketModal.css';

export default function TicketModal({ ticket, isOpen, onClose }) {
  if (!isOpen || !ticket) return null;

  const eventTitle = ticket.event_title || ticket.title || 'Event Confirmation';
  const eventDate = ticket.event_date
    ? new Date(ticket.event_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBD';
  const eventTime = ticket.event_time ? ticket.event_time.slice(0, 5) : 'Time TBD';
  const venue = ticket.venue || 'Venue to be announced';
  const attendeeName = ticket.attendee_name || ticket.user_name || 'Attendee';
  const ticketCode = ticket.ticket_code || 'TKT-PENDING';
  const ticketStatus = ticket.ticket_status || ticket.status || 'VALID';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="ticket-modal-overlay" onClick={onClose}>
      <div className="ticket-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="ticket-modal-header">
          <h3>Official Event Ticket</h3>
          <button
            className="ticket-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Printable Ticket Pass */}
        <div className="ticket-pass">
          <div className="ticket-pass-header">
            <span className="ticket-badge-pill">EMS E-Ticket</span>
            <span
              className={`badge ${
                ticketStatus === 'VALID' ? 'badge-success' : 'badge-danger'
              }`}
            >
              {ticketStatus}
            </span>
          </div>

          <h2 className="ticket-title">{eventTitle}</h2>

          <div className="ticket-details-grid">
            <div className="ticket-field">
              <span className="ticket-field-label">Date &amp; Time</span>
              <span className="ticket-field-value">
                {eventDate} at {eventTime}
              </span>
            </div>

            <div className="ticket-field">
              <span className="ticket-field-label">Location / Venue</span>
              <span className="ticket-field-value">{venue}</span>
            </div>

            <div className="ticket-field">
              <span className="ticket-field-label">Attendee Name</span>
              <span className="ticket-field-value">{attendeeName}</span>
            </div>

            <div className="ticket-field">
              <span className="ticket-field-label">Registration ID</span>
              <span className="ticket-field-value">
                #{ticket.registration_id || ticket.id || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Stub & Barcode */}
        <div className="ticket-stub">
          <div className="ticket-code-block">
            <span className="ticket-code-label">Access Ticket Code</span>
            <span className="ticket-code-text">{ticketCode}</span>
          </div>

          <div className="ticket-qr-placeholder" title="Digital Verification Barcode">
            <div className="barcode-lines">
              <div className="barcode-line thick"></div>
              <div className="barcode-line"></div>
              <div className="barcode-line thick"></div>
              <div className="barcode-line"></div>
              <div className="barcode-line thick"></div>
              <div className="barcode-line"></div>
              <div className="barcode-line thick"></div>
              <div className="barcode-line"></div>
              <div className="barcode-line"></div>
            </div>
          </div>
        </div>

        <div className="ticket-modal-actions">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            Download / Print Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

