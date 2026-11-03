import React, { useEffect, useState } from 'react';
import { registrationService } from '../services/registrationService';
import './ParticipantsModal.css';

export default function ParticipantsModal({ event, isOpen, onClose }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadParticipants() {
      if (!event || !event.id) return;
      try {
        setLoading(true);
        setError(null);
        const res = await registrationService.getEventParticipants(event.id);
        setParticipants(res?.participants || []);
      } catch (err) {
        console.error('Failed to load participants:', err);
        setError(err.message || 'Unable to load attendees list.');
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      loadParticipants();
    }
  }, [event, isOpen]);

  if (!isOpen || !event) return null;

  const filtered = participants.filter((p) => {
    const q = searchTerm.toLowerCase();
    const name = (p.name || p.participant_name || '').toLowerCase();
    const email = (p.email || p.participant_email || '').toLowerCase();
    const code = (p.ticket_code || '').toLowerCase();
    return name.includes(q) || email.includes(q) || code.includes(q);
  });

  const handlePrintRoster = () => {
    window.print();
  };

  return (
    <div className="participants-modal-overlay" onClick={onClose}>
      <div className="participants-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="participants-modal-header">
          <div>
            <h3>Attendee Roster &amp; Participants</h3>
            <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              {event.title} &bull; Capacity: {event.capacity} seats
            </p>
          </div>
          <button className="participants-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="participants-modal-body">
          <div className="participants-search-bar">
            <input
              type="text"
              className="form-control"
              placeholder="Search by attendee name, email, or ticket code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Loading participant roster...</p>
            </div>
          ) : error ? (
            <div className="badge badge-danger" style={{ display: 'block', padding: '12px' }}>
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              {participants.length === 0
                ? 'No attendees have registered for this event yet.'
                : 'No attendees match your search query.'}
            </div>
          ) : (
            <div className="participants-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Attendee Name</th>
                    <th>Email</th>
                    <th>Ticket Code</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Registered At</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, idx) => {
                    const participantName = p.name || p.participant_name || 'Attendee';
                    const participantEmail = p.email || p.participant_email || 'N/A';
                    const regStatus = p.status || p.registration_status || 'REGISTERED';
                    const isConfirmed = regStatus === 'REGISTERED';

                    return (
                      <tr key={p.registration_id || p.id || idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{participantName}</strong>
                        </td>
                        <td>{participantEmail}</td>
                        <td>
                          {p.ticket_code ? (
                            <code>{p.ticket_code}</code>
                          ) : (
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>None</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              p.payment_status === 'SUCCESS' ? 'badge-primary' : 'badge-warning'
                            }`}
                          >
                            {p.payment_status === 'SUCCESS' ? 'Paid (UPI)' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              isConfirmed ? 'badge-success' : 'badge-warning'
                            }`}
                          >
                            {regStatus}
                          </span>
                        </td>
                        <td>
                          {p.registered_at || p.created_at
                            ? new Date(p.registered_at || p.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="participants-modal-footer">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Total Registrations: <strong>{participants.length}</strong> / {event.capacity} seats (
            {Math.round(((participants.length || 0) / (event.capacity || 1)) * 100)}% filled)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline btn-sm" onClick={handlePrintRoster}>
              Print Roster
            </button>
            <button className="btn btn-primary btn-sm" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
