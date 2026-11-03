const pool = require("../config/database");
const {
    sendEventNotification,
    sendNotification
} = require("../services/notificationService");

// Check whether the logged-in user can manage events
const hasEventManagementAccess = (req) => {
    const role = String(req.user?.role || "").toUpperCase();
    return role === "ORGANIZER" || role === "ADMIN";
};

// F-005: Create Event
const createEvent = async (req, res) => {
    try {
        if (!hasEventManagementAccess(req)) return res.status(403).json({ message: "Organizer access required" });
        const organizer_id = req.user.id;
        const { title, description, event_date, event_time, venue, capacity, registration_open } = req.body;
        if (!title || !event_date || !event_time || !venue || !capacity) return res.status(400).json({ message: "Required event fields are missing" });
        if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) return res.status(400).json({ message: "Capacity must be a positive integer" });

        const result = await pool.query(
            `INSERT INTO events (organizer_id, title, description, event_date, event_time, venue, capacity, registration_open)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [organizer_id, title, description || null, event_date, event_time, venue, capacity, registration_open !== undefined ? registration_open : true]
        );
        return res.status(201).json({ message: "Event created successfully", event: result.rows[0] });
    } catch (error) {
        console.error("Create event error:", error.message);
        return res.status(500).json({ message: "Failed to create event" });
    }
};

// F-005: Update Event
const updateEvent = async (req, res) => {
    try {
        if (!hasEventManagementAccess(req)) return res.status(403).json({ message: "Organizer access required" });
        const { id } = req.params;
        const organizer_id = req.user.id;
        const { title, description, event_date, event_time, venue, capacity, registration_open } = req.body;
        if (!title || !event_date || !event_time || !venue || !capacity) return res.status(400).json({ message: "Required event fields are missing" });
        if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) return res.status(400).json({ message: "Capacity must be a positive integer" });

        const result = await pool.query(
            `UPDATE events SET title = $1, description = $2, event_date = $3, event_time = $4, venue = $5,
             capacity = $6, registration_open = $7, updated_at = CURRENT_TIMESTAMP
             WHERE id = $8 AND organizer_id = $9 RETURNING *`,
            [title, description || null, event_date, event_time, venue, capacity, registration_open !== undefined ? registration_open : true, id, organizer_id]
        );
        if (!result.rows.length) return res.status(404).json({ message: "Event not found or organizer is not authorized" });

        try {
            const updatedEvt = result.rows[0];
            await sendEventNotification(id, "EVENT_UPDATE", {
                title: `Event Updated: ${updatedEvt.title}`,
                message: `The details for "${updatedEvt.title}" have been updated. Venue: ${updatedEvt.venue}, Date: ${new Date(updatedEvt.event_date).toISOString().split("T")[0]}, Time: ${updatedEvt.event_time}.`
            });
        } catch (notifErr) {
            console.error("Event update notification error:", notifErr.message);
        }
        return res.status(200).json({ message: "Event updated successfully", event: result.rows[0] });
    } catch (error) {
        console.error("Update event error:", error.message);
        return res.status(500).json({ message: "Failed to update event" });
    }
};

// F-005: Delete Event
const deleteEvent = async (req, res) => {
    try {
        if (!hasEventManagementAccess(req)) return res.status(403).json({ message: "Organizer access required" });
        const { id } = req.params;
        const organizer_id = req.user.id;
        let registeredParticipants = [];
        try {
            const partRes = await pool.query(
                `SELECT DISTINCT r.user_id, u.email, u.name, e.title, e.event_date
                 FROM registrations r JOIN events e ON e.id = r.event_id LEFT JOIN users u ON u.id = r.user_id
                 WHERE r.event_id = $1 AND e.organizer_id = $2 AND r.status IN ('REGISTERED', 'PENDING_PAYMENT')`,
                [id, organizer_id]
            );
            registeredParticipants = partRes.rows;
        } catch (fetchErr) {
            console.error("Failed to query participants before deletion:", fetchErr.message);
        }

        const result = await pool.query(`DELETE FROM events WHERE id = $1 AND organizer_id = $2 RETURNING *`, [id, organizer_id]);
        if (!result.rows.length) return res.status(404).json({ message: "Event not found or organizer is not authorized" });

        for (const p of registeredParticipants) {
            try {
                await sendNotification({
                    userId: p.user_id, recipientEmail: p.email || `user${p.user_id}@example.com`,
                    eventId: Number(id), type: "EVENT_CANCELLED",
                    title: `Notice: Event "${p.title}" Cancelled`,
                    message: `We regret to inform you that "${p.title}" scheduled for ${new Date(p.event_date).toISOString().split("T")[0]} has been cancelled.`
                });
            } catch (notifErr) {
                console.error("Failed to send cancellation notification:", notifErr.message);
            }
        }
        return res.status(200).json({ message: "Event deleted successfully", event: result.rows[0] });
    } catch (error) {
        console.error("Delete event error:", error.message);
        return res.status(500).json({ message: "Failed to delete event" });
    }
};

// F-006: Search and Filter Public Events (includes live confirmed participant count)
const getEvents = async (req, res) => {
    try {
        const { search, venue, event_date, registration_open } = req.query;
        let query = `
            SELECT e.*,
                   COUNT(r.id) FILTER (
                       WHERE r.status IN ('REGISTERED', 'PENDING_PAYMENT')
                   )::INTEGER AS registered_count,
                   COUNT(r.id) FILTER (
                       WHERE r.status IN ('REGISTERED', 'PENDING_PAYMENT')
                   )::INTEGER AS participant_count
            FROM events e
            LEFT JOIN registrations r ON r.event_id = e.id
            WHERE e.event_date >= CURRENT_DATE
              AND e.status = 'ACTIVE'
        `;
        const values = [];
        let paramIndex = 1;

        if (search) {
            query += `
                AND (
                    e.title ILIKE $${paramIndex}
                    OR e.description ILIKE $${paramIndex}
                    OR e.venue ILIKE $${paramIndex}
                )
            `;

            values.push(`%${search}%`);
            paramIndex++;
        }

        if (venue) {
            query += ` AND e.venue ILIKE $${paramIndex}`;
            values.push(`%${venue}%`);
            paramIndex++;
        }

        if (event_date) {
            query += ` AND e.event_date = $${paramIndex}`;
            values.push(event_date);
            paramIndex++;
        }

        if (registration_open !== undefined) {
            query += ` AND e.registration_open = $${paramIndex}`;
            values.push(registration_open === "true");
            paramIndex++;
        }

        query += `
            GROUP BY e.id
            ORDER BY e.event_date ASC, e.event_time ASC
        `;
        const result = await pool.query(query, values);
        return res.status(200).json({ count: result.rows.length, events: result.rows });
    } catch (error) {
        console.error("Get events error:", error.message);
        return res.status(500).json({ message: "Failed to fetch events" });
    }
};

// Organizer Dashboard (includes pending + confirmed seats, as previously intended)
const getMyEvents = async (req, res) => {
    try {
        if (!hasEventManagementAccess(req)) return res.status(403).json({ message: "Organizer access required" });
        const result = await pool.query(
            `SELECT e.*,
                    COUNT(r.id) FILTER (WHERE r.status IN ('REGISTERED', 'PENDING_PAYMENT'))::INTEGER AS participant_count
             FROM events e LEFT JOIN registrations r ON r.event_id = e.id
             WHERE e.organizer_id = $1 GROUP BY e.id ORDER BY e.event_date DESC, e.event_time DESC`,
            [req.user.id]
        );
        return res.status(200).json({ message: "Organizer events retrieved successfully", count: result.rows.length, events: result.rows });
    } catch (error) {
        console.error("Get organizer events error:", error.message);
        return res.status(500).json({ message: "Failed to fetch events" });
    }
};

// F-007: View Event Details (includes live confirmed participant count)
const getEventById = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.*,
                    COUNT(r.id) FILTER (
                        WHERE r.status IN ('REGISTERED', 'PENDING_PAYMENT')
                    )::INTEGER AS registered_count,
                    COUNT(r.id) FILTER (
                        WHERE r.status IN ('REGISTERED', 'PENDING_PAYMENT')
                    )::INTEGER AS participant_count
             FROM events e
             LEFT JOIN registrations r ON r.event_id = e.id
             WHERE e.id = $1
             GROUP BY e.id`,
            [id]
        );
        if (!result.rows.length) return res.status(404).json({ message: "Event not found" });
        return res.status(200).json({ event: result.rows[0] });
    } catch (error) {
        console.error("Get event details error:", error.message);
        return res.status(500).json({ message: "Failed to fetch event details" });
    }
};

module.exports = { createEvent, updateEvent, deleteEvent, getEvents, getMyEvents, getEventById };
