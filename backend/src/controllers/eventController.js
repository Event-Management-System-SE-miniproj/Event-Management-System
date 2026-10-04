const pool = require("../config/database");

const createEvent = async (req, res) => {
    try {
        const {
            organizer_id,
            title,
            description,
            event_date,
            event_time,
            venue,
            capacity,
            registration_open
        } = req.body;

        if (
            !organizer_id ||
            !title ||
            !event_date ||
            !event_time ||
            !venue ||
            !capacity
        ) {
            return res.status(400).json({
                message: "Required event fields are missing"
            });
        }

        if (capacity <= 0) {
            return res.status(400).json({
                message: "Capacity must be greater than 0"
            });
        }

        const result = await pool.query(
            `INSERT INTO events
            (organizer_id, title, description, event_date, event_time,
             venue, capacity, registration_open)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                organizer_id,
                title,
                description || null,
                event_date,
                event_time,
                venue,
                capacity,
                registration_open !== undefined
                    ? registration_open
                    : true
            ]
        );

        return res.status(201).json({
            message: "Event created successfully",
            event: result.rows[0]
        });

    } catch (error) {
        console.error("Create event error:", error.message);

        return res.status(500).json({
            message: "Failed to create event"
        });
    }
};


const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            organizer_id,
            title,
            description,
            event_date,
            event_time,
            venue,
            capacity,
            registration_open
        } = req.body;

        if (!organizer_id) {
            return res.status(400).json({
                message: "Organizer ID is required"
            });
        }

        if (
            !title ||
            !event_date ||
            !event_time ||
            !venue ||
            !capacity
        ) {
            return res.status(400).json({
                message: "Required event fields are missing"
            });
        }

        if (capacity <= 0) {
            return res.status(400).json({
                message: "Capacity must be greater than 0"
            });
        }

        const result = await pool.query(
            `UPDATE events
             SET title = $1,
                 description = $2,
                 event_date = $3,
                 event_time = $4,
                 venue = $5,
                 capacity = $6,
                 registration_open = $7,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $8
               AND organizer_id = $9
             RETURNING *`,
            [
                title,
                description || null,
                event_date,
                event_time,
                venue,
                capacity,
                registration_open !== undefined
                    ? registration_open
                    : true,
                id,
                organizer_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Event not found or organizer is not authorized"
            });
        }

        return res.status(200).json({
            message: "Event updated successfully",
            event: result.rows[0]
        });

    } catch (error) {
        console.error("Update event error:", error.message);

        return res.status(500).json({
            message: "Failed to update event"
        });
    }
};


const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { organizer_id } = req.body;

        if (!organizer_id) {
            return res.status(400).json({
                message: "Organizer ID is required"
            });
        }

        const result = await pool.query(
            `DELETE FROM events
             WHERE id = $1
               AND organizer_id = $2
             RETURNING *`,
            [id, organizer_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Event not found or organizer is not authorized"
            });
        }

        return res.status(200).json({
            message: "Event deleted successfully",
            event: result.rows[0]
        });

    } catch (error) {
        console.error("Delete event error:", error.message);

        return res.status(500).json({
            message: "Failed to delete event"
        });
    }
};

// F-006: Search and Filter Events
const getEvents = async (req, res) => {
    try {
        const {
            search,
            venue,
            event_date,
            registration_open
        } = req.query;

        let query = `
            SELECT *
            FROM events
            WHERE event_date >= CURRENT_DATE
        `;

        const values = [];
        let paramIndex = 1;

        // Search by title, description, or venue
        if (search) {
            query += `
                AND (
                    title ILIKE $${paramIndex}
                    OR description ILIKE $${paramIndex}
                    OR venue ILIKE $${paramIndex}
                )
            `;

            values.push(`%${search}%`);
            paramIndex++;
        }

        // Filter by venue
        if (venue) {
            query += ` AND venue ILIKE $${paramIndex}`;
            values.push(`%${venue}%`);
            paramIndex++;
        }

        // Filter by date
        if (event_date) {
            query += ` AND event_date = $${paramIndex}`;
            values.push(event_date);
            paramIndex++;
        }

        // Filter by registration status
        if (registration_open !== undefined) {
            query += ` AND registration_open = $${paramIndex}`;
            values.push(registration_open === "true");
            paramIndex++;
        }

        query += `
            ORDER BY event_date ASC, event_time ASC
        `;

        const result = await pool.query(query, values);

        return res.status(200).json({
            count: result.rows.length,
            events: result.rows
        });

    } catch (error) {
        console.error("Get events error:", error.message);

        return res.status(500).json({
            message: "Failed to fetch events"
        });
    }
};


// F-007: View Event Details
const getEventById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT *
             FROM events
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        return res.status(200).json({
            event: result.rows[0]
        });

    } catch (error) {
        console.error("Get event details error:", error.message);

        return res.status(500).json({
            message: "Failed to fetch event details"
        });
    }
};

module.exports = {
    createEvent,
    updateEvent,
    deleteEvent,
    getEvents,
    getEventById
};