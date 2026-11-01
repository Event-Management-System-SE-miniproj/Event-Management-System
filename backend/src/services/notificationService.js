const pool = require("../config/database");

/**
 * Development / Test Notification Provider
 * Logs outgoing notifications and records them in memory for assertions.
 */
/**
 * Sanitize error message to prevent leaking SMTP credentials, passwords, or connection strings.
 */
const sanitizeErrorMessage = (errorMsg) => {
    if (!errorMsg || typeof errorMsg !== "string") return "Notification delivery failure";
    return errorMsg
        .replace(/(password|pass|secret|token|auth)=([^\s&]+)/gi, "$1=***")
        .replace(/([a-zA-Z0-9_.+-]+):([a-zA-Z0-9_.+-]+)@/g, "$1:***@");
};

class DevelopmentNotificationProvider {
    constructor() {
        this.sentMessages = [];
        this.simulateFailure = false;
    }

    setSimulateFailure(value) {
        this.simulateFailure = Boolean(value);
    }

    clear() {
        this.sentMessages = [];
    }

    async send({ to, subject, body, metadata }) {
        if (this.simulateFailure || process.env.NOTIFICATION_SIMULATE_FAILURE === "true") {
            throw new Error("Simulated notification provider delivery failure");
        }

        const messageRecord = {
            to,
            subject,
            body,
            metadata,
            timestamp: new Date()
        };

        this.sentMessages.push(messageRecord);
        console.log(`[NotificationProvider] Dispatched notification to ${to}: "${subject}"`);
        return { success: true, messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` };
    }
}

/**
 * Production-ready SMTP Provider skeleton
 * Configured using environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */
class SmtpNotificationProvider {
    constructor() {
        this.host = process.env.SMTP_HOST;
        this.port = process.env.SMTP_PORT || 587;
        this.user = process.env.SMTP_USER;
        this.pass = process.env.SMTP_PASS;
        this.from = process.env.NOTIFICATION_FROM_EMAIL || "no-reply@eventmanagement.com";
    }

    async send({ to, subject, body }) {
        // When SMTP is not configured, fall back to logging in development mode
        if (!this.host) {
            console.log(`[SmtpProvider: Dev fallback] To: ${to} | Subject: ${subject}`);
            return { success: true };
        }
        // In real SMTP setups, transport.sendMail would be invoked here
        console.log(`[SmtpProvider] Sending email via ${this.host} to ${to}: ${subject}`);
        return { success: true };
    }
}

// Active provider instance
let defaultProvider = new DevelopmentNotificationProvider();

const getNotificationProvider = () => defaultProvider;

const setNotificationProvider = (provider) => {
    defaultProvider = provider;
};

const resetNotificationProvider = () => {
    defaultProvider = new DevelopmentNotificationProvider();
    return defaultProvider;
};

/**
 * Send a notification, persist it to the database, and record status.
 * Handles deduplication for registration confirmation.
 */
const sendNotification = async ({
    userId,
    recipientEmail,
    eventId = null,
    registrationId = null,
    type,
    title,
    message
}) => {
    // Input validation
    if (!userId || typeof userId !== "number" || userId <= 0) {
        throw new Error("Invalid or missing userId for notification");
    }
    if (!recipientEmail || typeof recipientEmail !== "string" || !recipientEmail.includes("@")) {
        throw new Error("Invalid or missing recipientEmail for notification");
    }
    if (!type || typeof type !== "string" || type.trim().length === 0) {
        throw new Error("Invalid or missing notification type");
    }
    if (!title || typeof title !== "string" || title.trim().length === 0) {
        throw new Error("Invalid or missing notification title");
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
        throw new Error("Invalid or missing notification message");
    }

    // Deduplication check: Avoid sending duplicate registration confirmation notifications
    if (registrationId && type === "REGISTRATION_CONFIRMATION") {
        const existing = await pool.query(
            `SELECT * FROM notifications
             WHERE registration_id = $1 AND type = $2`,
            [registrationId, type]
        );

        if (existing.rows.length > 0) {
            console.log(`[NotificationService] Duplicate confirmation prevented for registration #${registrationId}`);
            return existing.rows[0];
        }
    }

    // Insert pending notification record
    const insertResult = await pool.query(
        `INSERT INTO notifications
            (user_id, recipient_email, event_id, registration_id, type, title, message, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
         RETURNING *`,
        [userId, recipientEmail, eventId, registrationId, type, title, message]
    );

    const notification = insertResult.rows[0];

    try {
        const provider = getNotificationProvider();
        await provider.send({
            to: recipientEmail,
            subject: title,
            body: message,
            metadata: {
                notificationId: notification.id,
                userId,
                eventId,
                registrationId,
                type
            }
        });

        // Update notification as SENT
        const updated = await pool.query(
            `UPDATE notifications
             SET status = 'SENT', sent_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [notification.id]
        );

        return updated.rows[0];

    } catch (providerError) {
        const safeErrorMsg = sanitizeErrorMessage(providerError.message);
        console.error(`[NotificationService] Provider delivery failed for notification #${notification.id}:`, safeErrorMsg);

        // Mark notification as FAILED in database
        const failed = await pool.query(
            `UPDATE notifications
             SET status = 'FAILED'
             WHERE id = $1
             RETURNING *`,
            [notification.id]
        );

        return failed.rows[0];
    }
};

/**
 * Generate registration confirmation notification
 */
const sendRegistrationConfirmation = async (registrationId, eventId, userId) => {
    try {
        // Query event details
        const eventRes = await pool.query(
            `SELECT title, event_date, event_time, venue FROM events WHERE id = $1`,
            [eventId]
        );
        const event = eventRes.rows[0] || {};

        // Query user details
        const userRes = await pool.query(
            `SELECT name, email FROM users WHERE id = $1`,
            [userId]
        );
        const user = userRes.rows[0] || {
            name: "Valued Attendee",
            email: `user${userId}@example.com`
        };

        // Query ticket if already exists
        const ticketRes = await pool.query(
            `SELECT ticket_code FROM tickets WHERE registration_id = $1`,
            [registrationId]
        );
        const ticket = ticketRes.rows[0];

        const formattedDate = event.event_date ? new Date(event.event_date).toISOString().split("T")[0] : "TBD";
        const ticketSnippet = ticket ? `\n- Ticket Code: ${ticket.ticket_code}` : "";

        const title = `Registration Confirmation: ${event.title || "Event"}`;
        const message = `Hello ${user.name || "Attendee"},\n\nYour registration for "${event.title || "Event"}" has been confirmed.\n\nEvent Details:\n- Date: ${formattedDate}\n- Time: ${event.event_time || "TBD"}\n- Venue: ${event.venue || "TBD"}\n- Registration ID: ${registrationId}${ticketSnippet}\n\nThank you for registering!`;

        return await sendNotification({
            userId,
            recipientEmail: user.email,
            eventId,
            registrationId,
            type: "REGISTRATION_CONFIRMATION",
            title,
            message
        });

    } catch (error) {
        const safeMsg = sanitizeErrorMessage(error.message);
        console.error(`[NotificationService] Failed to send registration confirmation:`, safeMsg);
        return { success: false, error: "Registration confirmation delivery failed" };
    }
};

/**
 * Send configured event notification to all registered participants
 */
const sendEventNotification = async (eventId, actionType, { title, message }) => {
    try {
        // Fetch event
        const eventRes = await pool.query(
            `SELECT id, title, event_date, event_time, venue FROM events WHERE id = $1`,
            [eventId]
        );

        if (eventRes.rows.length === 0) {
            return [];
        }

        const event = eventRes.rows[0];

        // Fetch distinct registered participants for this event
        const participantsRes = await pool.query(
            `SELECT DISTINCT r.user_id, u.email, u.name
             FROM registrations r
             LEFT JOIN users u ON u.id = r.user_id
             WHERE r.event_id = $1
               AND r.status IN ('REGISTERED', 'PENDING_PAYMENT')`,
            [eventId]
        );

        const notifications = [];

        for (const participant of participantsRes.rows) {
            const recipientEmail = participant.email || `user${participant.user_id}@example.com`;
            const defaultTitle = actionType === "EVENT_UPDATE"
                ? `Update: ${event.title}`
                : actionType === "EVENT_CANCELLED"
                    ? `Notice: ${event.title} Cancelled`
                    : `Notification: ${event.title}`;

            const defaultMessage = actionType === "EVENT_UPDATE"
                ? `Hello ${participant.name || "Attendee"},\n\nPlease note that event "${event.title}" has been updated. Date: ${new Date(event.event_date).toISOString().split("T")[0]}, Time: ${event.event_time}, Venue: ${event.venue}.`
                : actionType === "EVENT_CANCELLED"
                    ? `Hello ${participant.name || "Attendee"},\n\nWe regret to inform you that "${event.title}" scheduled for ${new Date(event.event_date).toISOString().split("T")[0]} has been cancelled.`
                    : `Hello ${participant.name || "Attendee"},\n\nThis is a notification regarding "${event.title}".`;

            const notif = await sendNotification({
                userId: participant.user_id,
                recipientEmail,
                eventId,
                type: actionType,
                title: title || defaultTitle,
                message: message || defaultMessage
            });

            notifications.push(notif);
        }

        return notifications;

    } catch (error) {
        const safeMsg = sanitizeErrorMessage(error.message);
        console.error(`[NotificationService] Failed to send event notifications:`, safeMsg);
        return [];
    }
};

/**
 * Retrieve notifications for a specific user with optional filters
 */
const getUserNotifications = async (userId, filters = {}) => {
    let query = `
        SELECT id, user_id, recipient_email, event_id, registration_id,
               type, title, message, status, is_read, read_at, sent_at, created_at
        FROM notifications
        WHERE user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status.toUpperCase());
        paramIndex++;
    }

    if (typeof filters.isRead === "boolean") {
        query += ` AND is_read = $${paramIndex}`;
        params.push(filters.isRead);
        paramIndex++;
    }

    if (filters.type) {
        query += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
    }

    if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
        paramIndex++;
    }

    const result = await pool.query(query, params);
    return result.rows;
};

/**
 * Retrieve a specific notification by ID for an authorized user
 */
const getNotificationById = async (id, userId) => {
    const result = await pool.query(
        `SELECT id, user_id, recipient_email, event_id, registration_id,
                type, title, message, status, is_read, read_at, sent_at, created_at
         FROM notifications
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
    );
    return result.rows[0] || null;
};

/**
 * Mark a notification as read
 */
const markNotificationAsRead = async (id, userId) => {
    const result = await pool.query(
        `UPDATE notifications
         SET is_read = TRUE,
             read_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId]
    );
    return result.rows[0] || null;
};

module.exports = {
    DevelopmentNotificationProvider,
    SmtpNotificationProvider,
    getNotificationProvider,
    setNotificationProvider,
    resetNotificationProvider,
    sendNotification,
    sendRegistrationConfirmation,
    sendEventNotification,
    getUserNotifications,
    getNotificationById,
    markNotificationAsRead
};
