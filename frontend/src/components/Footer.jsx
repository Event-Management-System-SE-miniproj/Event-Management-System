import React from 'react';
import { Link } from '../context/RouterContext';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-wrapper">
      <div className="footer-container">
        <div className="footer-branding">
          <span className="footer-title">EMS &bull; Event Management System</span>
        </div>

        <nav className="footer-nav" aria-label="Footer Navigation">
          <Link to="/">Home</Link>
          <Link to="/events">Events</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </nav>

        <div className="footer-copy">
          <span>&copy; {currentYear} EMS. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
