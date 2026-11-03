import { api } from './api';

/**
 * Payment Service
 * Communicates with /api/payments for UPI registration settlement and ticket confirmation.
 */
export const paymentService = {
  /**
   * F-010: Process instant UPI payment for an event registration
   */
  async processPayment({
    registration_id,
    amount = 25.00,
    payment_method = 'UPI',
    upi_id,
    transaction_id,
  }) {
    return await api.post(
      '/api/payments',
      {
        registration_id: Number(registration_id),
        amount: Number(amount),
        payment_method: 'UPI',
        upi_id: upi_id || 'attendee@okhdfcbank',
        transaction_id,
      },
      { requiresAuth: true }
    );
  },

  /**
   * F-010: Retrieve payment record for a registration
   */
  async getPaymentByRegistration(registrationId) {
    return await api.get(`/api/payments/registration/${registrationId}`, { requiresAuth: true });
  },
};
