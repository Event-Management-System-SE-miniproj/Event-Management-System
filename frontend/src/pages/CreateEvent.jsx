import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { eventService } from '../services/eventService';
import EventForm from '../components/EventForm';

export default function CreateEvent() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const { success, error } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData) => {
    if (!user || !user.id) {
      error('User session is invalid. Please log in again.');
      navigate('/login');
      return;
    }

    try {
      setSubmitting(true);
      const res = await eventService.createEvent({
        organizer_id: user.id,
        ...formData,
      });

      success(res?.message || 'Event created successfully!');
      if (res && res.event && res.event.id) {
        navigate(`/events/${res.event.id}`);
      } else {
        navigate('/events');
      }
    } catch (err) {
      const msg = err.message || 'Failed to create event.';
      error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/events');
  };

  return (
    <EventForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isEditing={false}
      submitting={submitting}
      formTitle="Create New Event"
      formSubtitle="Publish a new event to the EMS platform with automatic capacity enforcement"
    />
  );
}
