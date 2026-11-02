import React from 'react';
import { useRouter } from '../context/RouterContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Events from '../pages/Events';
import EventDetails from '../pages/EventDetails';
import Profile from '../pages/Profile';
import CreateEvent from '../pages/CreateEvent';
import EditEvent from '../pages/EditEvent';
import UserDashboard from '../pages/UserDashboard';
import OrganizerDashboard from '../pages/OrganizerDashboard';
import AdminDashboard from '../pages/AdminDashboard';

export default function AppRoutes() {
  const { currentPath, navigate } = useRouter();

  // Root / Home
  if (currentPath === '/') return <Home />;

  // Auth routes
  if (currentPath === '/login') return <Login />;
  if (currentPath === '/register') return <Register />;

  // Event discovery & listings
  if (currentPath === '/events') return <Events />;

  // User / Attendee Dashboard (Protected)
  if (currentPath === '/dashboard') {
    return (
      <ProtectedRoute>
        <UserDashboard />
      </ProtectedRoute>
    );
  }

  // Organizer Dashboard (Protected: Organizer & Admin)
  if (currentPath === '/organizer') {
    return (
      <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
        <OrganizerDashboard />
      </ProtectedRoute>
    );
  }

  // Admin Dashboard (Protected: Admin only)
  if (currentPath === '/admin') {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminDashboard />
      </ProtectedRoute>
    );
  }

  // Create event (Protected: Organizer & Admin)
  if (currentPath === '/events/create') {
    return (
      <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
        <CreateEvent />
      </ProtectedRoute>
    );
  }

  // Edit event (Protected: Organizer & Admin) : /events/:id/edit
  const editMatch = currentPath.match(/^\/events\/([^/]+)\/edit$/);
  if (editMatch) {
    const id = editMatch[1];
    return (
      <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
        <EditEvent id={id} />
      </ProtectedRoute>
    );
  }

  // View event details: /events/:id
  const detailsMatch = currentPath.match(/^\/events\/([^/]+)$/);
  if (detailsMatch) {
    const id = detailsMatch[1];
    return <EventDetails id={id} />;
  }

  // User profile (Protected)
  if (currentPath === '/profile') {
    return (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    );
  }

  // 404 Not Found fallback
  return (
    <div className="glass-panel not-found-card" style={{ padding: '36px', textAlign: 'center' }}>
      <h2>404 - Page Not Found</h2>
      <p style={{ margin: '12px 0 20px 0', color: 'var(--text-muted)' }}>
        The page you are looking for does not exist or has moved.
      </p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>
        Return Home
      </button>
    </div>
  );
}
