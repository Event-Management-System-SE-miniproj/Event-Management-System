
const pool = require("../config/database");
const { sendRegistrationConfirmation } = require("../services/notificationService");

// Helper: Query complete registration details with ticket & payment info
const queryUserRegistrations = async (userId) => {
    const result = await pool.query(
        `SELECT
            r.id,
            r.id AS registration_id,
            r.event_id,
            r.user_id,
            r.status,
            r.status AS registration_status,
            r.created_at,
            r.created_at AS registered_at,
            e.title AS event_title,
            e.description,
            e.event_date,
            e.event_time,
            e.venue,
            e.capacity,
            t.id AS ticket_id,
            t.ticket_code,
            t.status AS ticket_status,
            t.generated_at AS ticket_generated_at,
            p.id AS payment_id,
            p.status AS payment_status,
            p.amount AS payment_amount,
            p.payment_method,
            p.transaction_id
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         LEFT JOIN tickets t ON t.registration_id = r.id AND t.status = 'VALID'
         LEFT JOIN payments p ON p.registration_id = r.id AND p.status = 'SUCCESS'
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC`,
        [userId]
    );
    return result.rows;
};

// F-008/F-009: Register for Event + Enforce Capacity
const registerForEvent = async (req, res) => {
    const client = await pool.connect();

    try {
        const { event_id, user_id } = req.body;

        if (!event_id || !user_id) {
            return res.status(400).json({
                message: "Event ID and User ID are required"
            });
        }

        await client.query("BEGIN");

        const eventResult = await client.query(
            `SELECT id, capacity, registration_open, status
             FROM events
             WHERE id = $1
             FOR UPDATE`,
            [event_id]
        );

        if (eventResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const event = eventResult.rows[0];

        if (!event.registration_open) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Registration is closed for this event"
            });
        }

        // F-015: Reject registration if event is disabled
        if (event.status === "DISABLED") {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Cannot register for a disabled event"
            });
        }

        // F-015: Reject registration if user account is disabled
        const userStatusCheck = await client.query("SELECT status FROM users WHERE id = $1", [user_id]);
        if (userStatusCheck.rows.length > 0 && userStatusCheck.rows[0].status === "DISABLED") {
            await client.query("ROLLBACK");
            return res.status(403).json({
                message: "Disabled user account cannot register for events"
            });
        }

        const registrationResult = await client.query(
            `SELECT COUNT(*)::INTEGER AS registered_count
             FROM registrations
             WHERE event_id = $1
             AND status IN ('PENDING_PAYMENT', 'REGISTERED')`,
            [event_id]
        );

        const registeredCount =
            registrationResult.rows[0].registered_count;

        if (registeredCount >= event.capacity) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Event capacity has been reached"
            });
        }

        const duplicateResult = await client.query(
            `SELECT id
             FROM registrations
             WHERE event_id = $1
             AND user_id = $2`,
            [event_id, user_id]
        );

        if (duplicateResult.rows.length > 0) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                message: "User is already registered for this event"
            });
        }

        const result = await client.query(
            `INSERT INTO registrations
             (event_id, user_id, status)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [event_id, user_id, "PENDING_PAYMENT"]
        );

        await client.query("COMMIT");

        // F-014: Registration confirmation notification
        try {
            await sendRegistrationConfirmation(
                result.rows[0].id,
                event_id,
                user_id
            );
        } catch (notifErr) {
            console.error("Registration confirmation notification error:", notifErr.message);
        }

        return res.status(201).json({
            message: "Registration successful",
            registration: result.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Registration error:", error.message);

        return res.status(500).json({
            message: "Failed to register for event"
        });

    } finally {
        client.release();
    }
};


// F-012: View registrations of authenticated user
const getMyRegistrations = async (req, res) => {
    try {
        const userId = req.user.id;
        const registrations = await queryUserRegistrations(userId);

        return res.status(200).json({
            message: "Registrations retrieved successfully",
            count: registrations.length,
            registrations
        });

    } catch (error) {
        console.error("Registration retrieval error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve registrations"
        });
    }
};


// F-012: View registrations by specific user ID (Target user or Admin)
const getUserRegistrations = async (req, res) => {
    try {
        const targetUserId = Number(req.params.userId);

        if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        const callerRole = (req.user.role || "").toUpperCase();
        if (req.user.id !== targetUserId && callerRole !== "ADMIN") {
            return res.status(403).json({
                message: "You are not authorized to view registrations for this user"
            });
        }

        const registrations = await queryUserRegistrations(targetUserId);

        return res.status(200).json({
            message: "User registrations retrieved successfully",
            count: registrations.length,
            registrations
        });

    } catch (error) {
        console.error("User registrations retrieval error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve user registrations"
        });
    }
};


// F-012: Cancel an eligible registration (supports both user and admin cancellation)
const cancelRegistration = async (req, res) => {
    const client = await pool.connect();
    let transactionStarted = false;

    try {
        const userId = req.user.id;
        const userRole = (req.user.role || "").toUpperCase();
        const isAdmin = userRole === "ADMIN";
        const registrationId = Number(req.params.id);

        if (!Number.isInteger(registrationId) || registrationId <= 0) {
            return res.status(400).json({
                message: "Invalid registration ID"
            });
        }

        await client.query("BEGIN");
        transactionStarted = true;

        const registrationResult = await client.query(
            `SELECT id, user_id, status
             FROM registrations
             WHERE id = $1 AND ($2::boolean OR user_id = $3)
             FOR UPDATE`,
            [registrationId, isAdmin, userId]
        );

        if (registrationResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(404).json({
                message: "Registration not found"
            });
        }

        const registration = registrationResult.rows[0];

        if (!["PENDING_PAYMENT", "REGISTERED"].includes(registration.status)) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(400).json({
                message: "This registration cannot be cancelled"
            });
        }

        const result = await client.query(
            `UPDATE registrations
             SET status = 'CANCELLED'
             WHERE id = $1
             RETURNING *`,
            [registrationId]
        );

        await client.query(
            `UPDATE tickets
             SET status = 'CANCELLED'
             WHERE registration_id = $1`,
            [registrationId]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            message: "Registration cancelled successfully",
            registration: result.rows[0]
        });

    } catch (error) {
        if (transactionStarted) {
            await client.query("ROLLBACK");
        }

        console.error("Registration cancellation error:", error.message);

        return res.status(500).json({
            message: "Failed to cancel registration"
        });

    } finally {
        client.release();
    }
};


// F-013: View participants for organizer's event (or Admin)
const getEventParticipants = async (req, res) => {
    try {
        const eventId = Number(req.params.eventId);

        if (!Number.isInteger(eventId) || eventId <= 0) {
            return res.status(400).json({
                message: "Invalid event ID"
            });
        }

        const userRole = (req.user.role || "").toUpperCase();
        if (userRole !== "ORGANIZER" && userRole !== "ADMIN") {
            return res.status(403).json({
                message: "Organizer access required"
            });
        }

        const isAdmin = userRole === "ADMIN";

        const result = await pool.query(
            `SELECT e.id AS event_id,
                    e.title AS event_title,
                    e.capacity AS event_capacity,
                    e.organizer_id,
                    r.id AS registration_id,
                    r.id AS id,
                    r.status AS registration_status,
                    r.status AS status,
                    r.created_at AS registered_at,
                    r.created_at AS created_at,
                    u.id AS participant_id,
                    u.id AS user_id,
                    u.name AS participant_name,
                    u.name AS name,
                    u.email AS participant_email,
                    u.email AS email,
                    t.ticket_code,
                    t.status AS ticket_status,
                    p.status AS payment_status,
                    p.payment_method
             FROM events e
             LEFT JOIN registrations r
                ON r.event_id = e.id
                AND r.status IN ('REGISTERED', 'PENDING_PAYMENT')
             LEFT JOIN users u
                ON u.id = r.user_id
             LEFT JOIN tickets t
                ON t.registration_id = r.id
                AND t.status = 'VALID'
             LEFT JOIN payments p
                ON p.registration_id = r.id
                AND p.status = 'SUCCESS'
             WHERE e.id = $1 AND ($2::boolean OR e.organizer_id = $3)
             ORDER BY r.created_at DESC`,
            [eventId, isAdmin, req.user.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                message: "Event not found or you are not authorized"
            });
        }

        const participants = result.rows
            .filter(row => row.registration_id !== null)
            .map(({ event_id, event_title, event_capacity, organizer_id, ...participant }) => participant);

        return res.status(200).json({
            message: "Event participants retrieved successfully",
            event: {
                id: result.rows[0].event_id,
                title: result.rows[0].event_title,
                capacity: result.rows[0].event_capacity
            },
            count: participants.length,
            participants
        });

    } catch (error) {
        console.error("Event participants error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve event participants"
        });
    }
};


module.exports = {
    registerForEvent,
    getMyRegistrations,
    getUserRegistrations,
    cancelRegistration,
    getEventParticipants
};
