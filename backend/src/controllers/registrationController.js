
const pool = require("../config/database");

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

        // Lock the event row while checking capacity
        const eventResult = await client.query(
            `SELECT id, capacity, registration_open
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

        const result = await pool.query(
            `SELECT
                r.id AS registration_id,
                r.event_id,
                r.status AS registration_status,
                r.created_at AS registered_at,
                e.title AS event_title,
                e.description,
                e.event_date,
                e.event_time,
                e.venue
             FROM registrations r
             JOIN events e ON e.id = r.event_id
             WHERE r.user_id = $1
             ORDER BY r.created_at DESC`,
            [userId]
        );

        return res.status(200).json({
            message: "Registrations retrieved successfully",
            registrations: result.rows
        });

    } catch (error) {
        console.error(
            "Registration retrieval error:",
            error.message
        );

        return res.status(500).json({
            message: "Failed to retrieve registrations"
        });
    }
};


module.exports = {
    registerForEvent,
    getMyRegistrations
};
