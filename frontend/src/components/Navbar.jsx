import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, Link } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import './Navbar.css';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { navigate } = useRouter();
  const { info } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    info('You have been logged out.');
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const closeMenu = () => setMobileMenuOpen(false);

  // Check if current user is an organizer / admin
  const isOrganizer = user && (user.role === 'ORGANIZER' || user.role === 'ADMIN');

  return (
    <header className="navbar-wrapper glass-panel">
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <div className="brand-logo-icon">EMS</div>
          <div className="brand-text">
            <span className="brand-title">EventHub</span>
            <span className="brand-subtitle">Management System</span>
          </div>
        </Link>

        {/* Mobile Toggle Button */}
        <button
          className="navbar-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        {/* Navigation Links */}
        <nav className={`navbar-links ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="nav-main-links">
            <Link to="/" className="nav-link" onClick={closeMenu}>
              Home
            </Link>
            <Link to="/events" className="nav-link" onClick={closeMenu}>
              Events
            </Link>
            {isAuthenticated && isOrganizer && (
              <Link to="/events/create" className="nav-link nav-link-create" onClick={closeMenu}>
                + Create Event
              </Link>
            )}
          </div>

          <div className="nav-auth-links">
            {isAuthenticated ? (
              <div className="user-profile-menu">
                <Link to="/profile" className="user-badge-link" onClick={closeMenu}>
                  <div className="avatar-circle">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="user-details">
                    <span className="user-name">{user?.name || user?.email}</span>
                    <span className="badge badge-primary user-role-badge">{user?.role || 'USER'}</span>
                  </div>
                </Link>
                <button className="btn btn-outline btn-sm logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : (
              <div className="guest-actions">
                <Link to="/login" className="btn btn-outline btn-sm" onClick={closeMenu}>
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm" onClick={closeMenu}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
