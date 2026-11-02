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
import OrganizerDashboard from '../pages/OrganizerDashboard';

export default function AppRoutes() {
  const { currentPath, navigate } = useRouter();

  if (currentPath === '/') return <Home />;
  if (currentPath === '/login') return <Login />;
  if (currentPath === '/register') return <Register />;
  if (currentPath === '/events') return <Events />;

  if (currentPath === '/events/create') {
    return <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}><CreateEvent /></ProtectedRoute>;
  }

  const editMatch = currentPath.match(/^\/events\/([^/]+)\/edit$/);
  if (editMatch) {
    return <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}><EditEvent id={editMatch[1]} /></ProtectedRoute>;
  }

  const detailsMatch = currentPath.match(/^\/events\/([^/]+)$/);
  if (detailsMatch) return <EventDetails id={detailsMatch[1]} />;

  if (currentPath === '/profile') {
    return <ProtectedRoute><Profile /></ProtectedRoute>;
  }

  if (currentPath === '/organizer') {
    return <ProtectedRoute allowedRoles={['ORGANIZER']}><OrganizerDashboard /></ProtectedRoute>;
  }

  if (currentPath === '/admin') {
    return <ProtectedRoute allowedRoles={['ADMIN']}><div className="glass-panel not-found-card"><h2>Admin dashboard</h2><p>The admin dashboard interface has not been added yet.</p><button className="btn btn-primary" onClick={() => navigate('/')}>Return home</button></div></ProtectedRoute>;
  }

  return <div className="glass-panel not-found-card"><h2>404 - Page Not Found</h2><p>The page you are looking for does not exist or has moved.</p><button className="btn btn-primary" onClick={() => navigate('/')}>Return Home</button></div>;
}
