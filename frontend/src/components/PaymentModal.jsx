import React, { useState } from 'react';
import { paymentService } from '../services/paymentService';
import { useToast } from '../context/ToastContext';
import './PaymentModal.css';

export default function PaymentModal({
  registration,
  event,
  isOpen,
  onClose,
  onPaymentSuccess,
}) {
  const { success, error } = useToast();

  const [upiId, setUpiId] = useState('attendee@okhdfcbank');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen || !registration || !event) return null;

  const registrationFee = 25.00;
  const regId = registration.id || registration.registration_id;

  const popularHandles = ['@okhdfcbank', '@oksbi', '@paytm', '@ybl', '@axl'];

  const handleSelectHandle = (handle) => {
    const base = upiId.includes('@') ? upiId.split('@')[0] : upiId;
    setUpiId(`${base || 'attendee'}${handle}`);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setErrorMessage(null);

    const trimmedUpi = upiId.trim();
    if (!trimmedUpi || !trimmedUpi.includes('@') || trimmedUpi.startsWith('@') || trimmedUpi.endsWith('@')) {
      const msg = 'Please enter a valid UPI Virtual Payment Address (e.g., username@bank)';
      setErrorMessage(msg);
      error(msg);
      setProcessing(false);
      return;
    }

    try {
      const generatedTxnId = `UPI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const res = await paymentService.processPayment({
        registration_id: regId,
        amount: registrationFee,
        payment_method: 'UPI',
        upi_id: trimmedUpi,
        transaction_id: generatedTxnId,
      });

      success(res?.message || 'UPI Payment confirmed! Admission ticket issued.');
      if (onPaymentSuccess) {
        onPaymentSuccess(res.payment, res.ticket);
      }
    } catch (err) {
      console.error('Payment failure:', err);
      const msg = err.message || 'UPI Payment transaction failed. Please try again.';
      setErrorMessage(msg);
      error(msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <div className="payment-modal-header-title">
            <span className="upi-badge-pill">UPI Instant</span>
            <h3>UPI Event Registration Fee</h3>
          </div>
          <button
            className="payment-modal-close"
            onClick={onClose}
            aria-label="Close modal"
            disabled={processing}
          >
            &times;
          </button>
        </div>

        <div className="payment-modal-body">
          {/* Order Summary */}
          <div className="payment-order-summary">
            <div className="payment-order-row">
              <span>Event:</span>
              <strong>{event.title}</strong>
            </div>
            <div className="payment-order-row">
              <span>Registration ID:</span>
              <span className="badge badge-info">#{regId}</span>
            </div>
            <div className="payment-order-row">
              <span>Payment Mode:</span>
              <strong style={{ color: 'var(--primary)' }}>Unified Payments Interface (UPI)</strong>
            </div>
            <div className="payment-order-total">
              <span>Total Amount Due:</span>
              <span className="payment-amount-highlight">${registrationFee.toFixed(2)}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="badge badge-danger" style={{ display: 'block', padding: '10px', marginBottom: '14px' }}>
              {errorMessage}
            </div>
          )}

          {/* UPI Method Header & Supported Apps */}
          <div className="upi-method-banner">
            <div className="upi-banner-left">
              <span className="upi-logo-text">UPI</span>
              <div>
                <strong>Pay via UPI Virtual Payment Address</strong>
                <p>Instant ticket issuance upon confirmed UPI transfer</p>
              </div>
            </div>
          </div>

          <div className="upi-supported-apps">
            <span className="upi-app-pill">GPay</span>
            <span className="upi-app-pill">PhonePe</span>
            <span className="upi-app-pill">Paytm</span>
            <span className="upi-app-pill">BHIM</span>
            <span className="upi-app-pill">Any UPI App</span>
          </div>

          {/* Payment Form */}
          <form id="payment-form" onSubmit={handleProcessPayment}>
            <div className="form-group">
              <label className="form-label" htmlFor="upi-vpa-input">
                Enter UPI ID / VPA
              </label>
              <div className="upi-input-group">
                <input
                  id="upi-vpa-input"
                  type="text"
                  className="form-control"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. mobile@okhdfcbank or user@upi"
                  required
                  disabled={processing}
                  autoComplete="off"
                />
              </div>
              <div className="upi-handle-chips">
                <span className="upi-chips-label">Popular handles:</span>
                {popularHandles.map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    className="upi-chip-btn"
                    onClick={() => handleSelectHandle(handle)}
                    disabled={processing}
                  >
                    {handle}
                  </button>
                ))}
              </div>
            </div>

            <div className="payment-security-notice">
              <span>&#128274; Unified Payments Interface &bull; Real-time Simulated Settlement &bull; Instant Admission Pass</span>
            </div>
          </form>
        </div>

        <div className="payment-modal-footer">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="payment-form"
            className="btn btn-primary"
            disabled={processing}
          >
            {processing ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner-sm"></span> Verifying UPI...
              </span>
            ) : (
              `Pay $${registrationFee.toFixed(2)} via UPI & Confirm`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
