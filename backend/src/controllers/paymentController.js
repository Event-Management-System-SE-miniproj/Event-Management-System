const pool = require("../config/database");
const crypto = require("crypto");

// F-010: Process Payment (UPI Instant Settlement & Ticket Issuance)
const processPayment = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            registration_id,
            amount = 25.00,
            payment_method = "UPI",
            upi_id,
            vpa,
            transaction_id
        } = req.body;

        const regId = Number(registration_id);

        if (!Number.isInteger(regId) || regId <= 0) {
            return res.status(400).json({
                message: "Valid registration ID is required"
            });
        }

        const effectiveUpiId = (upi_id || vpa || "").trim();

        await client.query("BEGIN");

        // Verify registration exists
        const registrationResult = await client.query(
            `SELECT id, event_id, user_id, status
             FROM registrations
             WHERE id = $1
             FOR UPDATE`,
            [regId]
        );

        if (registrationResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Registration not found"
            });
        }

        const registration = registrationResult.rows[0];

        // Reject payment for cancelled registration
        if (registration.status === "CANCELLED") {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Cannot process payment for a cancelled registration"
            });
        }

        // Check if a successful payment already exists
        const existingPayment = await client.query(
            `SELECT id, status, transaction_id, amount
             FROM payments
             WHERE registration_id = $1
             AND status = 'SUCCESS'`,
            [regId]
        );

        if (existingPayment.rows.length > 0) {
            // Check if ticket also already exists
            const existingTicket = await client.query(
                "SELECT * FROM tickets WHERE registration_id = $1",
                [regId]
            );

            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "Payment has already been completed",
                payment: existingPayment.rows[0],
                ticket: existingTicket.rows[0] || null
            });
        }

        // Simulated UPI Gateway Processing:
        // A payment explicitly containing 'fail' in the UPI ID simulates gateway rejection.
        // Otherwise, valid simulated UPI flow confirms the payment.
        const isSimulatedFailure = effectiveUpiId.toLowerCase().includes("fail");
        const paymentSuccessful = !isSimulatedFailure;

        const paymentStatus = paymentSuccessful ? "SUCCESS" : "FAILED";
        const finalMethod = (payment_method || "UPI").toUpperCase().includes("UPI") ? "UPI" : payment_method;
        const txnId = transaction_id || `UPI-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        const finalAmount = Number(amount) > 0 ? Number(amount) : 25.00;

        const paymentResult = await client.query(
            `INSERT INTO payments
                (registration_id, amount, payment_method,
                 transaction_id, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                regId,
                finalAmount,
                finalMethod,
                txnId,
                paymentStatus
            ]
        );

        if (!paymentSuccessful) {
            await client.query(
                `UPDATE registrations
                 SET status = 'PAYMENT_FAILED'
                 WHERE id = $1`,
                [regId]
            );

            await client.query("COMMIT");

            return res.status(402).json({
                message: "UPI payment transaction failed",
                payment: paymentResult.rows[0]
            });
        }

        // Confirm registration after successful payment
        await client.query(
            `UPDATE registrations
             SET status = 'REGISTERED'
             WHERE id = $1`,
            [regId]
        );

        // Generate or activate a unique ticket for this confirmed registration
        const ticketCode = `TKT-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

        const ticketResult = await client.query(
            `INSERT INTO tickets
                (registration_id, ticket_code, status)
             VALUES ($1, $2, 'VALID')
             ON CONFLICT (registration_id)
             DO UPDATE SET status = 'VALID', ticket_code = EXCLUDED.ticket_code
             RETURNING *`,
            [regId, ticketCode]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            message: "UPI payment successful. Registration confirmed.",
            payment: paymentResult.rows[0],
            ticket: ticketResult.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Payment processing error:", error.message);

        return res.status(500).json({
            message: "Failed to process payment"
        });

    } finally {
        client.release();
    }
};

// Retrieve payment record by registration ID
const getPaymentByRegistration = async (req, res) => {
    try {
        const registrationId = Number(req.params.registrationId);

        if (!Number.isInteger(registrationId) || registrationId <= 0) {
            return res.status(400).json({
                message: "Invalid registration ID"
            });
        }

        const result = await pool.query(
            `SELECT * FROM payments
             WHERE registration_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [registrationId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Payment record not found for this registration"
            });
        }

        return res.status(200).json({
            message: "Payment record retrieved successfully",
            payment: result.rows[0]
        });

    } catch (error) {
        console.error("Payment retrieval error:", error.message);
        return res.status(500).json({
            message: "Failed to retrieve payment record"
        });
    }
};

module.exports = {
    processPayment,
    getPaymentByRegistration
};
