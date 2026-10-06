import React from 'react';
import './DeleteConfirmModal.css';

export default function DeleteConfirmModal({
  isOpen,
  title = 'Delete Event',
  eventTitle,
  onConfirm,
  onCancel,
  isDeleting = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card">
        <h3 id="modal-title" className="modal-title">{title}</h3>
        <p className="modal-description">
          Are you sure you want to delete{' '}
          <strong>"{eventTitle || 'this event'}"</strong>?
          This action cannot be undone and will remove all associated registrations.
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger-solid"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
