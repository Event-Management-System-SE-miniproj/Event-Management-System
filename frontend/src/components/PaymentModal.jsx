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

  const [paymentMethod, setPaymentMethod] = useState('Credit / Debit Card');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardHolder, setCardHolder] = useState('Jane Doe');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('321');
  const [upiId, setUpiId] = useState('attendee@okhdfcbank');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen || !registration || !event) return null;

  const registrationFee = 25.00;

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setErrorMessage(null);

    try {
      const generatedTxnId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const res = await paymentService.processPayment({
        registration_id: registration.id,
        amount: registrationFee,
        payment_method: paymentMethod,
        transaction_id: generatedTxnId,
      });

      success(res?.message || 'Payment confirmed successfully!');
      if (onPaymentSuccess) {
        onPaymentSuccess(res.payment);
      }
    } catch (err) {
      console.error('Payment failure:', err);
      const msg = err.message || 'Payment transaction failed. Please try again.';
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
          <h3>Secure Event Checkout</h3>
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
              <span>#{registration.id}</span>
            </div>
            <div className="payment-order-total">
              <span>Total Registration Fee:</span>
              <span className="payment-amount-highlight">${registrationFee.toFixed(2)}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="badge badge-danger" style={{ display: 'block', padding: '10px', marginBottom: '14px' }}>
              {errorMessage}
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="payment-methods-tabs">
            <button
              type="button"
              className={`payment-method-btn ${paymentMethod === 'Credit / Debit Card' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('Credit / Debit Card')}
            >
              Card
            </button>
            <button
              type="button"
              className={`payment-method-btn ${paymentMethod === 'UPI / Instant Pay' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('UPI / Instant Pay')}
            >
              UPI / NetBanking
            </button>
            <button
              type="button"
              className={`payment-method-btn ${paymentMethod === 'Campus Wallet' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('Campus Wallet')}
            >
              Campus Wallet
            </button>
          </div>

          {/* Payment Form */}
          <form id="payment-form" onSubmit={handleProcessPayment}>
            {paymentMethod === 'Credit / Debit Card' && (
              <div className="payment-form-grid">
                <div className="form-group">
                  <label className="form-label">Card Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4532 0000 0000 0000"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cardholder Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Full name as printed on card"
                    required
                  />
                </div>

                <div className="payment-form-row">
                  <div className="form-group">
                    <label className="form-label">Expires (MM/YY)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      placeholder="MM/YY"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV / CVC</label>
                    <input
                      type="password"
                      maxLength={4}
                      className="form-control"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="•••"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'UPI / Instant Pay' && (
              <div className="payment-form-grid">
                <div className="form-group">
                  <label className="form-label">Virtual Payment Address (VPA / UPI ID)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="username@bank"
                    required
                  />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  A secure push notification prompt will be simulated to verify instant campus settlement.
                </p>
              </div>
            )}

            {paymentMethod === 'Campus Wallet' && (
              <div className="payment-form-grid">
                <div className="form-group">
                  <label className="form-label">Student / Staff ID</label>
                  <input
                    type="text"
                    className="form-control"
                    defaultValue="PES2UG24CS-EMS"
                    required
                  />
                </div>
                <div className="badge badge-success" style={{ padding: '8px' }}>
                  Available Balance: $120.00
                </div>
              </div>
            )}

            <div className="payment-security-notice">
              <span>&#128274; 256-bit TLS Encrypted Transaction &bull; PCI-DSS Gateway Compliant</span>
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
            {processing ? 'Processing Payment...' : `Pay $${registrationFee.toFixed(2)} & Confirm`}
          </button>
        </div>
      </div>
    </div>
  );
}

