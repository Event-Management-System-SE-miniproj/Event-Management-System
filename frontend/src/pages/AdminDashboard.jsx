
import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'users') {
        const data = await adminService.getUsers({ search });
        setUsers(data.users || []);
      } else if (activeTab === 'events') {
        const data = await adminService.getEvents({ search });
        setEvents(data.events || []);
      } else {
        const data = await adminService.getAuditLogs();
        setLogs(data.logs || []);
      }
    } catch (err) {
      setError(err.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const performAction = async (action, successMessage) => {
    setError('');
    setMessage('');

    try {
      await action();
      setMessage(successMessage);
      await loadData();
    } catch (err) {
      setError(err.message || 'Action failed.');
    }
  };

  const handleUserStatus = (id, status) => {
    performAction(
      () => adminService.setUserStatus(id, status),
      `User ${status.toLowerCase()} successfully.`
    );
  };

  const handleEventAction = (id, action) => {
    const actions = {
      approve: () => adminService.approveEvent(id),
      disable: () => adminService.disableEvent(id),
      enable: () => adminService.enableEvent(id),
    };

    const messages = {
      approve: 'Event approved successfully.',
      disable: 'Event disabled successfully.',
      enable: 'Event enabled successfully.',
    };

    performAction(actions[action], messages[action]);
  };

  return (
    <main style={{ maxWidth: '1200px', margin: '30px auto', padding: '20px' }}>
      <h1>Admin Dashboard</h1>
      <p>Manage users, events and system activity.</p>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '25px 0' }}>
        {['users', 'events', 'logs'].map((tab) => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => {
              setActiveTab(tab);
              setSearch('');
              setMessage('');
              setError('');
            }}
          >
            {tab === 'users'
              ? 'User Management'
              : tab === 'events'
                ? 'Event Management'
                : 'Audit Logs'}
          </button>
        ))}
      </div>

      {message && <p role="status" style={{ color: 'green' }}>{message}</p>}
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      {activeTab !== 'logs' && (
        <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'users' ? 'Search users...' : 'Search events...'}
            style={{ padding: '10px', width: 'min(100%, 350px)', marginRight: '10px' }}
          />
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading dashboard data...</p>
      ) : (
        <>
          {activeTab === 'users' && (
            <section>
              <h2>Users ({users.length})</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>{user.status}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline"
                            disabled={user.role === 'ADMIN'}
                            onClick={() =>
                              handleUserStatus(
                                user.id,
                                user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
                              )
                            }
                          >
                            {user.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <p>No users found.</p>}
              </div>
            </section>
          )}

          {activeTab === 'events' && (
            <section>
              <h2>Events ({events.length})</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Organizer</th>
                      <th>Venue</th>
                      <th>Status</th>
                      <th>Participants</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td>{event.title}</td>
                        <td>{event.organizer_name || 'Unknown'}</td>
                        <td>{event.venue}</td>
                        <td>{event.status}</td>
                        <td>{event.participant_count ?? 0}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {event.status === 'PENDING' && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleEventAction(event.id, 'approve')}
                              >
                                Approve
                              </button>
                            )}
                            {event.status === 'DISABLED' ? (
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => handleEventAction(event.id, 'enable')}
                              >
                                Enable
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => handleEventAction(event.id, 'disable')}
                              >
                                Disable
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {events.length === 0 && <p>No events found.</p>}
              </div>
            </section>
          )}

          {activeTab === 'logs' && (
            <section>
              <h2>Audit Logs ({logs.length})</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Target Type</th>
                      <th>Target ID</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.action}</td>
                        <td>{log.target_type}</td>
                        <td>{log.target_id}</td>
                        <td>
                          {log.created_at
                            ? new Date(log.created_at).toLocaleString()
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length === 0 && <p>No audit logs found.</p>}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
