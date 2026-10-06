import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { eventService } from '../services/eventService';
import EventForm from '../components/EventForm';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function EditEvent({ id }) {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const { success, error, warning } = useToast();

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    async function loadEvent() {
      if (!id || isNaN(Number(id))) {
        setErrorMessage('Invalid Event ID.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);
        const res = await eventService.getEventById(id);
        if (res && res.event) {
          const ev = res.event;

          // Check if current user is the owner or an admin
          if (user && ev.organizer_id && user.id !== ev.organizer_id && user.role !== 'ADMIN') {
            warning('You are not authorized to edit this event.');
            navigate(`/events/${id}`);
            return;
          }

          setEventData(ev);
        } else {
          setErrorMessage('Event not found.');
        }
      } catch (err) {
        if (err.status === 404) {
          setErrorMessage('This event does not exist or has been deleted.');
        } else {
          setErrorMessage(err.message || 'Failed to load event details.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [id, user, navigate, warning]);

  const handleSubmit = async (formData) => {
    if (!user || !user.id) {
      error('User session is invalid. Please log in again.');
      navigate('/login');
      return;
    }

    try {
      setSubmitting(true);
      const res = await eventService.updateEvent(id, {
        organizer_id: user.id,
        ...formData,
      });

      success(res?.message || 'Event updated successfully!');
      navigate(`/events/${id}`);
    } catch (err) {
      // Backend 404/unauthorized error: "Event not found or organizer is not authorized"
      const msg = err.message || 'Failed to update event.';
      error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user || !user.id) {
      error('User session is invalid. Please log in again.');
      return;
    }

    try {
      setDeleting(true);
      const res = await eventService.deleteEvent(id, user.id);
      success(res?.message || 'Event deleted successfully.');
      setShowDeleteModal(false);
      navigate('/events');
    } catch (err) {
      const msg = err.message || 'Failed to delete event.';
      error(msg);
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state glass-panel">
        <div className="spinner"></div>
        <p>Loading event for editing...</p>
      </div>
    );
  }

  if (errorMessage || !eventData) {
    return (
      <div className="glass-panel not-found-card">
        <h2>Cannot Edit Event</h2>
        <p>{errorMessage || 'The requested event is unavailable.'}</p>
        <button className="btn btn-primary" onClick={() => navigate('/events')}>
          &larr; Back to Events
        </button>
      </div>
    );
  }

  return (
    <>
      <EventForm
        initialData={eventData}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/events/${id}`)}
        onDelete={() => setShowDeleteModal(true)}
        isEditing={true}
        submitting={submitting}
        deleting={deleting}
        formTitle="Edit Event"
        formSubtitle="Update schedules, location, capacity, or registration status"
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        eventTitle={eventData.title}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={deleting}
      />
    </>
  );
}
