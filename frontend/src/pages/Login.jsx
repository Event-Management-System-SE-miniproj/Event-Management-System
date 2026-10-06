import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, Link } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import './AuthForm.css';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, redirect to events
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/events');
    }
  }, [isAuthenticated, navigate]);

  const validate = () => {
    const errors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      error('Please complete all required fields correctly.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await login(email.trim(), password);
      success(res?.message || 'Login successful. Welcome back.');
      navigate('/events');
    } catch (err) {
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      error(msg);
      if (err.status === 401) {
        setFieldErrors({
          auth: 'Invalid email or password. Please try again.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="brand-logo-icon auth-logo">EMS</div>
          <h2>Welcome Back</h2>
          <p>Log in to manage registrations and events</p>
        </div>

        {fieldErrors.auth && (
          <div className="auth-alert-banner">
            <span>{fieldErrors.auth}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email Address *
            </label>
            <input
              id="login-email"
              type="email"
              className={`form-control ${fieldErrors.email ? 'input-error' : ''}`}
              placeholder="name@pes.edu"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email || fieldErrors.auth) {
                  setFieldErrors((prev) => ({ ...prev, email: null, auth: null }));
                }
              }}
            />
            {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password *
            </label>
            <input
              id="login-password"
              type="password"
              className={`form-control ${fieldErrors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password || fieldErrors.auth) {
                  setFieldErrors((prev) => ({ ...prev, password: null, auth: null }));
                }
              }}
            />
            {fieldErrors.password && <span className="field-error-text">{fieldErrors.password}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/register">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
