const pool = require("../config/database");

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
               AND status = 'REGISTERED'`,
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
             (event_id, user_id)
             VALUES ($1, $2)
             RETURNING *`,
            [event_id, user_id]
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

module.exports = {
    registerForEvent
};