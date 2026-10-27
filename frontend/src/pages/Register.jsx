
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, Link } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import './AuthForm.css';

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { success, error } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [organizationName, setOrganizationName] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Redirect authenticated users to the events page.
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

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!['USER', 'ORGANIZER'].includes(role)) {
      errors.role = 'Please select a valid account type.';
    }

    if (role === 'ORGANIZER' && !organizationName.trim()) {
      errors.organizationName = 'Organization name is required for organizers.';
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
        role,
        ...(role === 'ORGANIZER' && {
          organizationName: organizationName.trim(),
        }),
      });

      success(
        res?.message || 'Account created successfully! Please sign in.'
      );

      navigate('/login');
    } catch (err) {
      const message = err.message || 'Failed to create account.';
      error(message);

      if (err.status === 409) {
        setFieldErrors((prev) => ({
          ...prev,
          email: 'This email is already registered.',
        }));
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
            <label className="form-label" htmlFor="register-role">
              Account Type *
            </label>
            <select
              id="register-role"
              className={`form-control ${fieldErrors.role ? 'input-error' : ''}`}
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setOrganizationName('');
                setFieldErrors((prev) => ({
                  ...prev,
                  role: null,
                  organizationName: null,
                }));
              }}
              required
            >
              <option value="USER">Regular User</option>
              <option value="ORGANIZER">Event Organizer</option>
            </select>
            {fieldErrors.role && (
              <span className="field-error-text">{fieldErrors.role}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-name">
              Full Name *
            </label>
            <input
              id="register-name"
              type="text"
              className={`form-control ${fieldErrors.name ? 'input-error' : ''}`}
              placeholder="e.g. Alex Johnson"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: null }));
                }
              }}
            />
            {fieldErrors.name && (
              <span className="field-error-text">{fieldErrors.name}</span>
            )}
          </div>

          {role === 'ORGANIZER' && (
            <div className="form-group">
              <label className="form-label" htmlFor="organization-name">
                Organization Name *
              </label>
              <input
                id="organization-name"
                type="text"
                className={`form-control ${
                  fieldErrors.organizationName ? 'input-error' : ''
                }`}
                placeholder="e.g. PES Coding Club"
                value={organizationName}
                onChange={(e) => {
                  setOrganizationName(e.target.value);
                  setFieldErrors((prev) => ({
                    ...prev,
                    organizationName: null,
                  }));
                }}
                required
              />
              {fieldErrors.organizationName && (
                <span className="field-error-text">
                  {fieldErrors.organizationName}
                </span>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              Email Address *
            </label>
            <input
              id="register-email"
              type="email"
              className={`form-control ${fieldErrors.email ? 'input-error' : ''}`}
              placeholder="name@pes.edu"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: null }));
                }
              }}
            />
            {fieldErrors.email && (
              <span className="field-error-text">{fieldErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              Password (min 8 characters) *
            </label>
            <input
              id="register-password"
              type="password"
              className={`form-control ${fieldErrors.password ? 'input-error' : ''}`}
              placeholder="Enter your password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: null }));
                }
              }}
            />
            {fieldErrors.password && (
              <span className="field-error-text">{fieldErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label
              className="form-label"
              htmlFor="register-confirm-password"
            >
              Confirm Password *
            </label>
            <input
              id="register-confirm-password"
              type="password"
              className={`form-control ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    confirmPassword: null,
                  }));
                }
              }}
            />
            {fieldErrors.confirmPassword && (
              <span className="field-error-text">
                {fieldErrors.confirmPassword}
              </span>
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
