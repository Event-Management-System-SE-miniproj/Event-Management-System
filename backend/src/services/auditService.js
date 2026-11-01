const pool = require("../config/database");

/**
 * Sanitize details object or string to ensure no sensitive credentials or tokens are logged.
 */
const sanitizeDetails = (details) => {
    if (!details) return null;
    if (typeof details === "string") {
        try {
            const parsed = JSON.parse(details);
            return JSON.stringify(sanitizeDetails(parsed));
        } catch {
            return details;
        }
    }
    if (typeof details === "object") {
        const sanitized = { ...details };
        const sensitiveKeys = ["password", "password_hash", "token", "jwt", "secret", "authorization"];
        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
                delete sanitized[key];
            } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
                sanitized[key] = sanitizeDetails(sanitized[key]);
            }
        }
        return JSON.stringify(sanitized);
    }
    return String(details);
};

/**
 * Record an administrative action in the audit log.
 */
const logAdminAction = async ({
    adminId,
    action,
    targetType = null,
    targetId = null,
    details = null,
    status = "SUCCESS"
}) => {
    try {
        const sanitized = sanitizeDetails(details);
        const result = await pool.query(
            `INSERT INTO audit_logs
                (admin_id, action, target_type, target_id, details, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [adminId, action, targetType, targetId, sanitized, status]
        );
        return result.rows[0];
    } catch (error) {
        console.error("Audit log error:", error.message);
        // Do not throw so that main admin action does not break if audit insert has an issue
        return null;
    }
};

/**
 * Retrieve audit logs for administrator review.
 */
const getAuditLogs = async ({ limit = 50, offset = 0, action, targetType } = {}) => {
    let query = `
        SELECT a.id, a.admin_id, u.name AS admin_name, u.email AS admin_email,
               a.action, a.target_type, a.target_id, a.details, a.status, a.created_at
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.admin_id
        WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (action) {
        query += ` AND a.action = $${paramIndex}`;
        params.push(action);
        paramIndex++;
    }

    if (targetType) {
        query += ` AND a.target_type = $${paramIndex}`;
        params.push(targetType);
        paramIndex++;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
};

/**
 * Retrieve a specific audit log by ID.
 */
const getAuditLogById = async (id) => {
    const result = await pool.query(
        `SELECT a.id, a.admin_id, u.name AS admin_name, u.email AS admin_email,
                a.action, a.target_type, a.target_id, a.details, a.status, a.created_at
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.admin_id
         WHERE a.id = $1`,
        [id]
    );
    return result.rows[0] || null;
};

module.exports = {
    logAdminAction,
    getAuditLogs,
    getAuditLogById
};
