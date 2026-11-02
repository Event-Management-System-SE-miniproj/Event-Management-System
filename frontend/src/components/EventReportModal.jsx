import React, { useEffect, useState } from 'react';
import { registrationService } from '../services/registrationService';
import './EventReportModal.css';

export default function EventReportModal({ event, isOpen, onClose }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!event || !event.id) return;
      try {
        setLoading(true);
        const res = await registrationService.getEventParticipants(event.id);
        setParticipants(res?.participants || []);
      } catch (err) {
        console.error('Failed to load report data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      loadStats();
    }
  }, [event, isOpen]);

  if (!isOpen || !event) return null;

  const capacity = Number(event.capacity) || 1;
  const activeRegistrations = participants.filter((p) => p.registration_status !== 'CANCELLED');
  const cancelledRegistrations = participants.filter((p) => p.registration_status === 'CANCELLED');
  const registeredCount = activeRegistrations.length;
  const remainingSeats = Math.max(0, capacity - registeredCount);
  const occupancyPercent = Math.min(100, Math.round((registeredCount / capacity) * 100));

  // Count payments
  const paidRegistrations = participants.filter((p) => p.payment_status === 'SUCCESS');
  const estimatedRevenue = paidRegistrations.length * 25.0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <h3>Event Lifecycle &amp; Analytics Report</h3>
          <button className="report-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="report-modal-body">
          <div className="report-summary-banner">
            <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-main)' }}>{event.title}</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Venue: <strong>{event.venue}</strong> &bull; Date:{' '}
              {new Date(event.event_date).toLocaleDateString()} at {event.event_time}
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>Generating report metrics...</p>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="report-kpi-grid">
                <div className="report-kpi-card">
                  <div className="report-kpi-val">{registeredCount}</div>
                  <div className="report-kpi-label">Registered Seats</div>
                </div>

                <div className="report-kpi-card">
                  <div className="report-kpi-val">{remainingSeats}</div>
                  <div className="report-kpi-label">Remaining Seats</div>
                </div>

                <div className="report-kpi-card">
                  <div className="report-kpi-val">${estimatedRevenue.toFixed(0)}</div>
                  <div className="report-kpi-label">Confirmed Revenue</div>
                </div>
              </div>

              {/* Progress Utilization */}
              <div className="capacity-progress-container">
                <div className="capacity-progress-labels">
                  <span>Capacity Utilization</span>
                  <span>
                    {registeredCount} / {capacity} seats ({occupancyPercent}%)
                  </span>
                </div>
                <div className="capacity-progress-bar-bg">
                  <div
                    className="capacity-progress-fill"
                    style={{ width: `${occupancyPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Status Breakdown Table */}
              <div style={{ marginTop: '20px' }}>
                <h5 style={{ marginBottom: '10px', color: 'var(--text-main)' }}>Audit Breakdown</h5>
                <table className="data-table">
                  <tbody>
                    <tr>
                      <td>Total Configured Capacity</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{capacity}</td>
                    </tr>
                    <tr>
                      <td>Active Registered Attendees</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                        {registeredCount}
                      </td>
                    </tr>
                    <tr>
                      <td>Cancelled Registrations</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                        {cancelledRegistrations.length}
                      </td>
                    </tr>
                    <tr>
                      <td>Confirmed Online Payments</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{paidRegistrations.length}</td>
                    </tr>
                    <tr>
                      <td>Registration Status</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`badge ${event.registration_open ? 'badge-success' : 'badge-danger'}`}>
                          {event.registration_open ? 'OPEN' : 'CLOSED'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="report-modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            Export / Print Report
          </button>
        </div>
      </div>
    </div>
  );
}

