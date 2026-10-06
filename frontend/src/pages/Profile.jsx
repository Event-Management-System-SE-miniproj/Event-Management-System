import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/auth';
import './Profile.css';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER');
  const [userId, setUserId] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    async function loadLatestProfile() {
      try {
        setLoading(true);
        const res = await authService.getProfile();
        if (res && res.user) {
          setName(res.user.name || '');
          setEmail(res.user.email || '');
          setRole(res.user.role || 'USER');
          setUserId(res.user.id || '');
          setCreatedAt(res.user.created_at || '');
          setUpdatedAt(res.user.updated_at || '');
        }
      } catch (err) {
        error(err.message || 'Failed to load profile details.');
        // Fallback to cached context user
        if (user) {
          setName(user.name || '');
          setEmail(user.email || '');
          setRole(user.role || 'USER');
          setUserId(user.id || '');
        }
      } finally {
        setLoading(false);
      }
    }

    loadLatestProfile();
  }, []);

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

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      error('Please correct the errors in the profile form.');
      return;
    }

    try {
      setSaving(true);
      const res = await updateProfile({
        name: name.trim(),
        email: email.trim(),
      });

      if (res && res.user) {
        setName(res.user.name);
        setEmail(res.user.email);
        setUpdatedAt(res.user.updated_at);
      }

      success(res?.message || 'Profile updated successfully.');
    } catch (err) {
      // Backend error response format: { message: "Email is already registered" }
      const msg = err.message || 'Failed to update profile.';
      error(msg);
      if (err.status === 409) {
        setFieldErrors((prev) => ({ ...prev, email: 'This email is already in use by another account.' }));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page-container">
        <div className="profile-card glass-panel loading-state">
          <div className="spinner"></div>
          <p>Loading your profile details...</p>
        </div>
      </div>
    );
  }

  const formattedJoinedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Member';

  return (
    <div className="profile-page-container">
      <div className="profile-card glass-panel">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {name ? name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2>User Profile</h2>
            <p className="profile-subtitle">Manage your account information and preferences</p>
          </div>
        </div>

        <div className="profile-info-summary">
          <div className="info-badge-item">
            <span className="info-label">Account Role:</span>
            <span className="badge badge-primary">{role}</span>
          </div>
          <div className="info-badge-item">
            <span className="info-label">User ID:</span>
            <code>#{userId}</code>
          </div>
          <div className="info-badge-item">
            <span className="info-label">Member Since:</span>
            <span className="info-value-text">{formattedJoinedDate}</span>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="profile-name">
              Full Name *
            </label>
            <input
              id="profile-name"
              type="text"
              className={`form-control ${fieldErrors.name ? 'input-error' : ''}`}
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
            <label className="form-label" htmlFor="profile-email">
              Email Address *
            </label>
            <input
              id="profile-email"
              type="email"
              className={`form-control ${fieldErrors.email ? 'input-error' : ''}`}
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null });
              }}
            />
            {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
          </div>

          <div className="profile-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
