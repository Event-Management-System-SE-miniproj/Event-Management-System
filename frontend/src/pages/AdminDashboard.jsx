import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminService } from '../services/adminService';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'users' | 'audit'
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search filters
  const [eventSearch, setEventSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, eventsRes, usersRes, logsRes] = await Promise.all([
        adminService.getStats(),
        adminService.getEvents(),
        adminService.getUsers(),
        adminService.getAuditLogs(),
      ]);

      setStats(statsRes?.stats || null);
      setEvents(eventsRes?.events || []);
      setUsers(usersRes?.users || []);
      setAuditLogs(logsRes?.logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      error(err.message || 'Unable to load administrator data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const handleUpdateEventStatus = async (eventId, newStatus, regOpen) => {
    try {
      await adminService.updateEventStatus(eventId, {
        status: newStatus,
        registration_open: regOpen,
      });
      success(`Event status updated to ${newStatus}.`);
      loadAllAdminData();
    } catch (err) {
      error(err.message || 'Failed to update event status.');
    }
  };

  const handleToggleUserStatus = async (targetUser) => {
    try {
      const newStatus = targetUser.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
      await adminService.updateUserStatus(targetUser.id, newStatus);
      success(`User ${targetUser.name} status updated to ${newStatus}.`);
      loadAllAdminData();
    } catch (err) {
      error(err.message || 'Failed to update user status.');
    }
  };

  const filteredEvents = events.filter((e) => {
    const q = eventSearch.toLowerCase();
    return (
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.venue && e.venue.toLowerCase().includes(q)) ||
      (e.organizer_name && e.organizer_name.toLowerCase().includes(q)) ||
      (e.organizer_email && e.organizer_email.toLowerCase().includes(q))
    );
  });

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  return (
    <div className="admin-container">
      {/* Banner */}
      <section className="admin-header-banner">
        <div className="admin-header-text">
          <h1>System Administration Portal</h1>
          <p>
            Audit logging, global event supervision, user permission controls, and system health metrics.
          </p>
        </div>
        <div>
          <button className="btn btn-outline" onClick={loadAllAdminData}>
            Refresh System State
          </button>
        </div>
      </section>

      {/* KPI Stats */}
      {stats && (
        <section className="organizer-kpi-grid">
          <div className="organizer-kpi-card">
            <span className="organizer-kpi-val">{stats.totalUsers}</span>
            <span className="organizer-kpi-label">Registered Accounts</span>
          </div>
          <div className="organizer-kpi-card">
            <span className="organizer-kpi-val">{stats.totalEvents}</span>
            <span className="organizer-kpi-label">Platform Events</span>
          </div>
          <div className="organizer-kpi-card">
            <span className="organizer-kpi-val">{stats.activeEvents}</span>
            <span className="organizer-kpi-label">Active / Approved Events</span>
          </div>
          <div className="organizer-kpi-card">
            <span className="organizer-kpi-val">{stats.totalRegistrations}</span>
            <span className="organizer-kpi-label">Confirmed Registrations</span>
          </div>
          <div className="organizer-kpi-card">
            <span className="organizer-kpi-val">${Number(stats.totalRevenue).toFixed(0)}</span>
            <span className="organizer-kpi-label">Platform Payment Volume</span>
          </div>
        </section>
      )}

      {/* Tab Controls */}
      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Event Supervision &amp; Approvals ({events.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Accounts &amp; RBAC ({users.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          System Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Content Panes */}
      <section className="admin-content-card glass-panel">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Retrieving administrative records...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: EVENTS */}
            {activeTab === 'events' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by event title, organizer, venue..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    style={{ maxWidth: '400px' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                    Showing {filteredEvents.length} of {events.length} events
                  </span>
                </div>

                <div className="registrations-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Event Title</th>
                        <th>Organizer</th>
                        <th>Date &amp; Venue</th>
                        <th>Registrations</th>
                        <th>Status</th>
                        <th>Supervision Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((evt) => {
                        const isApproved = evt.status === 'ACTIVE' || evt.status === 'APPROVED';
                        const isDisabled = evt.status === 'DISABLED';
                        const regCount = Number(evt.registered_count) || 0;

                        return (
                          <tr key={evt.id}>
                            <td>#{evt.id}</td>
                            <td>
                              <strong>{evt.title}</strong>
                            </td>
                            <td>
                              <div>{evt.organizer_name || 'Organizer'}</div>
                              <small style={{ color: 'var(--text-muted)' }}>{evt.organizer_email}</small>
                            </td>
                            <td>
                              {new Date(evt.event_date).toLocaleDateString()}
                              <br />
                              <small style={{ color: 'var(--text-muted)' }}>{evt.venue}</small>
                            </td>
                            <td>
                              <strong>{regCount}</strong> / {evt.capacity} seats
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  isDisabled ? 'badge-danger' : 'badge-success'
                                }`}
                              >
                                {evt.status || 'ACTIVE'}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons-cell">
                                {!isApproved && (
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleUpdateEventStatus(evt.id, 'ACTIVE', true)}
                                  >
                                    Approve Event
                                  </button>
                                )}
                                {isApproved && (
                                  <button
                                    className="btn btn-outline btn-sm"
                                    style={{ color: 'var(--danger)' }}
                                    onClick={() => handleUpdateEventStatus(evt.id, 'DISABLED', false)}
                                  >
                                    Disable Event
                                  </button>
                                )}
                                {isDisabled && (
                                  <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => handleUpdateEventStatus(evt.id, 'ACTIVE', true)}
                                  >
                                    Re-enable Event
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: USERS */}
            {activeTab === 'users' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name, email, or role..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    style={{ maxWidth: '400px' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                    Showing {filteredUsers.length} of {users.length} accounts
                  </span>
                </div>

                <div className="registrations-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Full Name</th>
                        <th>Email Address</th>
                        <th>Account Role</th>
                        <th>Status</th>
                        <th>Joined Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const isActive = u.status === 'ACTIVE' || !u.status;
                        return (
                          <tr key={u.id}>
                            <td>#{u.id}</td>
                            <td>
                              <strong>{u.name}</strong>
                            </td>
                            <td>{u.email}</td>
                            <td>
                              <span
                                className={`badge ${
                                  u.role === 'ADMIN'
                                    ? 'badge-danger'
                                    : u.role === 'ORGANIZER'
                                    ? 'badge-primary'
                                    : 'badge-warning'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  isActive ? 'badge-success' : 'badge-danger'
                                }`}
                              >
                                {u.status || 'ACTIVE'}
                              </span>
                            </td>
                            <td>
                              {u.created_at
                                ? new Date(u.created_at).toLocaleDateString()
                                : 'N/A'}
                            </td>
                            <td>
                              <div className="action-buttons-cell">
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ color: isActive ? 'var(--danger)' : 'var(--success)' }}
                                  onClick={() => handleToggleUserStatus(u)}
                                >
                                  {isActive ? 'Disable User' : 'Activate User'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: AUDIT LOGS */}
            {activeTab === 'audit' && (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Cryptographically immutable, timestamped security and management logs (EMS-NF-004, EMS-SR-005).
                </p>

                <div className="registrations-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Log ID</th>
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>Target</th>
                        <th>Admin Actor</th>
                        <th>Details</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td>#{log.id}</td>
                          <td>
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td>
                            <code>{log.action}</code>
                          </td>
                          <td>
                            {log.target_type} #{log.target_id}
                          </td>
                          <td>
                            {log.admin_name || `Admin #${log.admin_id}`}
                          </td>
                          <td>{log.details}</td>
                          <td>
                            <span className="badge badge-success">{log.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

