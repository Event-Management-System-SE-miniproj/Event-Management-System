import { api } from './api';

/**
 * Payment Service
 * Communicates with /api/payments for registration payments.
 */
export const paymentService = {
  /**
   * F-010: Process payment for a registration
   */
  async processPayment({ registration_id, amount, payment_method, transaction_id }) {
    return await api.post(
      '/api/payments',
      {
        registration_id: Number(registration_id),
        amount: Number(amount),
        payment_method: payment_method || 'Credit Card',
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

