import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user, loading } = useAuth();
  const { navigate } = useRouter();

  if (loading) {
    return (
      <div className="loading-screen glass-panel">
        <div className="spinner"></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated user to /login
    navigate('/login');
    return null;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="glass-panel unauthorized-card">
        <h2>Access Restricted</h2>
        <p>You do not have permission to view this organizer resource.</p>
        <button className="btn btn-primary" onClick={() => navigate('/events')}>
          Browse Events
        </button>
      </div>
    );
  }

  return children;
}
