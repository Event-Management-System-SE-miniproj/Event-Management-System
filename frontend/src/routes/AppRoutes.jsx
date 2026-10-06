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

export default function AppRoutes() {
  const { currentPath, navigate } = useRouter();

  // Root / Home
  if (currentPath === '/') {
    return <Home />;
  }

  // Auth routes
  if (currentPath === '/login') {
    return <Login />;
  }
  if (currentPath === '/register') {
    return <Register />;
  }

  // Event browsing
  if (currentPath === '/events') {
    return <Events />;
  }

  // Create event (Protected)
  if (currentPath === '/events/create') {
    return (
      <ProtectedRoute>
        <CreateEvent />
      </ProtectedRoute>
    );
  }

  // Edit event (Protected) : /events/:id/edit
  const editMatch = currentPath.match(/^\/events\/([^/]+)\/edit$/);
  if (editMatch) {
    const id = editMatch[1];
    return (
      <ProtectedRoute>
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
    <div className="glass-panel not-found-card">
      <h2>404 - Page Not Found</h2>
      <p>The page you are looking for does not exist or has moved.</p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>
        Return Home
      </button>
    </div>
  );
}
