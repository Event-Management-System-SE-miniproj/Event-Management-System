import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, Link } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import './AuthForm.css';

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { success, error, info } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, redirect to events
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/events');
    }
  }, [isAuthenticated, navigate]);

  const validate = () => {
    const errors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      errors.name = 'Full name is required.';
    }

    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must contain at least 8 characters.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      error('Please correct the errors in the form.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      success(res?.message || 'Account created successfully! Please sign in.');
      navigate('/login');
    } catch (err) {
      // Backend error response format: { message: "Email is already registered" }
      const message = err.message || 'Failed to create account.';
      error(message);
      if (err.status === 409) {
        setFieldErrors((prev) => ({ ...prev, email: 'This email is already registered.' }));
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
          <h2>Create Account</h2>
          <p>Join EMS to discover and register for campus events</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">
              Full Name *
            </label>
            <input
              id="register-name"
              type="text"
              className={`form-control ${fieldErrors.name ? 'input-error' : ''}`}
              placeholder="e.g. Alex Johnson"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: null });
              }}
            />
            {fieldErrors.name && <span className="field-error-text">{fieldErrors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              Email Address *
            </label>
            <input
              id="register-email"
              type="email"
              className={`form-control ${fieldErrors.email ? 'input-error' : ''}`}
              placeholder="name@pes.edu"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null });
              }}
            />
            {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              Password (min 8 characters) *
            </label>
            <input
              id="register-password"
              type="password"
              className={`form-control ${fieldErrors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null });
              }}
            />
            {fieldErrors.password && <span className="field-error-text">{fieldErrors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-confirm-password">
              Confirm Password *
            </label>
            <input
              id="register-confirm-password"
              type="password"
              className={`form-control ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
              placeholder="••••••••"
              required
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: null });
              }}
            />
            {fieldErrors.confirmPassword && (
              <span className="field-error-text">{fieldErrors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
