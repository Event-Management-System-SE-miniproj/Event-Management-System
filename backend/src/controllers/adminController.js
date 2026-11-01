const pool = require("../config/database");
const { logAdminAction, getAuditLogs, getAuditLogById } = require("../services/auditService");

// ----------------------------------------------------
// USER MANAGEMENT (F-015)
// ----------------------------------------------------

/**
 * List all users with filtering. Never exposes password_hash.
 */
const getAllUsers = async (req, res) => {
    try {
        const { search, role, status } = req.query;

        let query = `
            SELECT id, name, email, role, status, created_at, updated_at
            FROM users
            WHERE 1=1
        `;
        const values = [];
        let paramIndex = 1;

        if (search) {
            query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        if (role) {
            query += ` AND role = $${paramIndex}`;
            values.push(role.toUpperCase());
            paramIndex++;
        }

        if (status) {
            query += ` AND status = $${paramIndex}`;
            values.push(status.toUpperCase());
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            message: "Users retrieved successfully",
            count: result.rows.length,
            users: result.rows
        });

    } catch (error) {
        console.error("Admin get users error:", error.message);
        return res.status(500).json({
            message: "Failed to retrieve users"
        });
    }
};

/**
 * Get individual user details. Never exposes password_hash.
 */
const getUserDetails = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        const userResult = await pool.query(
            `SELECT id, name, email, role, status, created_at, updated_at
             FROM users
             WHERE id = $1`,
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Fetch registration count/history summary
        const regCountRes = await pool.query(
            `SELECT COUNT(*)::INTEGER AS count
             FROM registrations
             WHERE user_id = $1`,
            [id]
        );

        const user = userResult.rows[0];
        user.total_registrations = regCountRes.rows[0].count;

        return res.status(200).json({
            message: "User details retrieved successfully",
            user
        });

    } catch (error) {
        console.error("Admin get user details error:", error.message);
        return res.status(500).json({
            message: "Failed to retrieve user details"
        });
    }
};

/**
 * Disable or activate a user account.
 */
const setUserStatus = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const status = req.body ? req.body.status : undefined;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        const normalizedStatus = String(status || "").trim().toUpperCase();

        if (!["ACTIVE", "DISABLED"].includes(normalizedStatus)) {
            return res.status(400).json({
                message: "Invalid status. Must be 'ACTIVE' or 'DISABLED'"
            });
        }

        // Prevent admin from disabling their own account
        if (id === req.user.id && normalizedStatus === "DISABLED") {
            return res.status(400).json({
                message: "Administrators cannot disable their own account"
            });
        }

        const userCheck = await pool.query("SELECT id, name, email, role, status FROM users WHERE id = $1", [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const prevUser = userCheck.rows[0];

        const result = await pool.query(
            `UPDATE users
             SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, name, email, role, status, created_at, updated_at`,
            [normalizedStatus, id]
        );

        const action = normalizedStatus === "DISABLED" ? "USER_DISABLE" : "USER_ENABLE";

        await logAdminAction({
            adminId: req.user.id,
            action,
            targetType: "USER",
            targetId: id,
            details: {
                user_email: prevUser.email,
                previous_status: prevUser.status,
                new_status: normalizedStatus
            }
        });

        return res.status(200).json({
            message: `User account has been ${normalizedStatus.toLowerCase()} successfully`,
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Admin set user status error:", error.message);
        return res.status(500).json({
            message: "Failed to update user status"
        });
    }
};

/**
 * Convenience helper to disable user.
 */
const disableUser = async (req, res) => {
    req.body = req.body || {};
    req.body.status = "DISABLED";
    return setUserStatus(req, res);
};

/**
 * Convenience helper to enable user.
 */
const enableUser = async (req, res) => {
    req.body = req.body || {};
    req.body.status = "ACTIVE";
    return setUserStatus(req, res);
};

/**
 * Update permitted user fields (e.g. role, name).
 */
const updateUser = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, role, status } = req.body || {};

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        const userCheck = await pool.query("SELECT id, name, email, role, status FROM users WHERE id = $1", [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const current = userCheck.rows[0];
        const newName = name ? name.trim() : current.name;
        let newRole = current.role;
        let newStatus = current.status;

        if (role) {
            const normalizedRole = String(role).trim().toUpperCase();
            if (!["USER", "ORGANIZER", "ADMIN"].includes(normalizedRole)) {
                return res.status(400).json({
                    message: "Invalid role specified"
                });
            }
            newRole = normalizedRole;
        }

        if (status) {
            const normalizedStatus = String(status).trim().toUpperCase();
            if (!["ACTIVE", "DISABLED"].includes(normalizedStatus)) {
                return res.status(400).json({
                    message: "Invalid status specified"
                });
            }
            newStatus = normalizedStatus;
        }

        const result = await pool.query(
            `UPDATE users
             SET name = $1, role = $2, status = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING id, name, email, role, status, created_at, updated_at`,
            [newName, newRole, newStatus, id]
        );

        await logAdminAction({
            adminId: req.user.id,
            action: "USER_UPDATE",
            targetType: "USER",
            targetId: id,
            details: {
                previous: { name: current.name, role: current.role, status: current.status },
                updated: { name: newName, role: newRole, status: newStatus }
            }
        });

        return res.status(200).json({
            message: "User updated successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Admin update user error:", error.message);
        return res.status(500).json({
            message: "Failed to update user"
        });
    }
};

// ----------------------------------------------------
// EVENT APPROVAL & DISABLING (F-015)
// ----------------------------------------------------

/**
 * List all events for administrative review.
 */
const getAdminEvents = async (req, res) => {
    try {
        const { status, search } = req.query;

        let query = `
            SELECT e.*,
                   u.name AS organizer_name,
                   u.email AS organizer_email,
                   (
                       SELECT COUNT(*)::INTEGER
                       FROM registrations r
                       WHERE r.event_id = e.id
                         AND r.status IN ('REGISTERED', 'PENDING_PAYMENT')
                   ) AS participant_count
            FROM events e
            LEFT JOIN users u ON u.id = e.organizer_id
            WHERE 1=1
        `;
        const values = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND e.status = $${paramIndex}`;
            values.push(status.toUpperCase());
            paramIndex++;
        }

        if (search) {
            query += ` AND (e.title ILIKE $${paramIndex} OR e.venue ILIKE $${paramIndex})`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        query += ` ORDER BY e.created_at DESC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            message: "Events retrieved successfully for admin review",
            count: result.rows.length,
            events: result.rows
        });

    } catch (error) {
        console.error("Admin get events error:", error.message);
        return res.status(500).json({
            message: "Failed to retrieve events"
        });
    }
};

/**
 * Approve a pending event.
 */
const approveEvent = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid event ID"
            });
        }

        const evtCheck = await pool.query("SELECT * FROM events WHERE id = $1", [id]);
        if (evtCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const prevEvt = evtCheck.rows[0];

        const result = await pool.query(
            `UPDATE events
             SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        await logAdminAction({
            adminId: req.user.id,
            action: "EVENT_APPROVE",
            targetType: "EVENT",
            targetId: id,
            details: {
                title: prevEvt.title,
                previous_status: prevEvt.status,
                new_status: "ACTIVE"
            }
        });

        return res.status(200).json({
            message: "Event approved successfully",
            event: result.rows[0]
        });

    } catch (error) {
        console.error("Admin approve event error:", error.message);
        return res.status(500).json({
            message: "Failed to approve event"
        });
    }
};

/**
 * Disable an event.
 */
const disableEvent = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid event ID"
            });
        }

        const evtCheck = await pool.query("SELECT * FROM events WHERE id = $1", [id]);
        if (evtCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const prevEvt = evtCheck.rows[0];

        const result = await pool.query(
            `UPDATE events
             SET status = 'DISABLED', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        await logAdminAction({
            adminId: req.user.id,
            action: "EVENT_DISABLE",
            targetType: "EVENT",
            targetId: id,
            details: {
                title: prevEvt.title,
                previous_status: prevEvt.status,
                new_status: "DISABLED"
            }
        });

        return res.status(200).json({
            message: "Event disabled successfully",
            event: result.rows[0]
        });

    } catch (error) {
        console.error("Admin disable event error:", error.message);
        return res.status(500).json({
            message: "Failed to disable event"
        });
    }
};

/**
 * Re-enable a disabled event.
 */
const enableEvent = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid event ID"
            });
        }

        const evtCheck = await pool.query("SELECT * FROM events WHERE id = $1", [id]);
        if (evtCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const prevEvt = evtCheck.rows[0];

        const result = await pool.query(
            `UPDATE events
             SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        await logAdminAction({
            adminId: req.user.id,
            action: "EVENT_ENABLE",
            targetType: "EVENT",
            targetId: id,
            details: {
                title: prevEvt.title,
                previous_status: prevEvt.status,
                new_status: "ACTIVE"
            }
        });

        return res.status(200).json({
            message: "Event re-enabled successfully",
            event: result.rows[0]
        });

    } catch (error) {
        console.error("Admin enable event error:", error.message);
        return res.status(500).json({
            message: "Failed to re-enable event"
        });
    }
};

// ----------------------------------------------------
// AUDIT LOG REVIEW (F-015)
// ----------------------------------------------------

/**
 * Review audit logs of administrative actions and system activity.
 */
const getAuditLogsList = async (req, res) => {
    try {
        const { action, targetType, limit, offset } = req.query;

        const parsedLimit = limit ? Math.min(Number(limit) || 50, 100) : 50;
        const parsedOffset = offset ? Number(offset) || 0 : 0;

        const logs = await getAuditLogs({
            limit: parsedLimit,
            offset: parsedOffset,
            action,
            targetType
        });

        return res.status(200).json({
            message: "Audit logs retrieved successfully",
            count: logs.length,
            logs
        });

    } catch (error) {
        console.error("Admin get audit logs error:", error.message);
        return res.status(500).json({
            message: "Failed to retrieve audit logs"
        });
    }
};

/**
 * Retrieve specific audit log by ID.
 */
const getAuditLog = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid audit log ID"
            });
        }

        const log = await getAuditLogById(id);

        if (!log) {
            return res.status(404).json({
                message: "Audit log not found"
            });
        }

        return res.status(200).json({
            message: "Audit log retrieved successfully",
            log
        });

    } catch (error) {
        console.error("Admin get single audit log error:", error.message);
        return res.status(500).json({
            message: "Failed to retrieve audit log"
        });
    }
};

module.exports = {
    getAllUsers,
    getUserDetails,
    setUserStatus,
    disableUser,
    enableUser,
    updateUser,
    getAdminEvents,
    approveEvent,
    disableEvent,
    enableEvent,
    getAuditLogsList,
    getAuditLog
};
