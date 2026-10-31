const pool = require("../config/database");

// F-011: Retrieve registration confirmation and ticket
const getTicket = async (req, res) => {
    try {
        const { registration_id } = req.params;

        const result = await pool.query(
            `SELECT
                r.id AS registration_id,
                r.status AS registration_status,
                e.title AS event_title,
                e.event_date,
                e.event_time,
                e.venue,
                u.name AS attendee_name,
                u.email AS attendee_email,
                p.status AS payment_status,
                t.ticket_code,
                t.status AS ticket_status,
                t.generated_at
             FROM registrations r
             JOIN events e ON e.id = r.event_id
             JOIN users u ON u.id = r.user_id
             JOIN payments p
                ON p.registration_id = r.id
                AND p.status = 'SUCCESS'
             JOIN tickets t ON t.registration_id = r.id
             WHERE r.id = $1`,
            [registration_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message:
                    "Confirmed ticket not found. Check the registration or payment status."
            });
        }

        return res.status(200).json({
            message: "Registration confirmation retrieved successfully",
            ticket: result.rows[0]
        });

    } catch (error) {
        console.error("Ticket retrieval error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve ticket"
        });
    }
};

module.exports = { getTicket };