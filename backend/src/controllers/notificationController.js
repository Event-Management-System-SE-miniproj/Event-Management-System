const {
    getUserNotifications,
    getNotificationById,
    markNotificationAsRead
} = require("../services/notificationService");

/**
 * Helper to validate integer ID parameters
 */
const validateNotificationId = (idParam) => {
    if (!idParam || typeof idParam !== "string" || !/^\d+$/.test(idParam.trim())) {
        return null;
    }
    const num = parseInt(idParam.trim(), 10);
    return num > 0 ? num : null;
};

// F-014: Get all notifications for authenticated user with input validation and filtering
const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, is_read, type, limit, offset } = req.query;
        const filters = {};

        // Validate status parameter
        if (status !== undefined) {
            const normalizedStatus = String(status).toUpperCase();
            const allowedStatuses = ["PENDING", "SENT", "FAILED"];
            if (!allowedStatuses.includes(normalizedStatus)) {
                return res.status(400).json({
                    message: "Invalid status filter. Allowed values: PENDING, SENT, FAILED"
                });
            }
            filters.status = normalizedStatus;
        }

        // Validate is_read parameter
        if (is_read !== undefined) {
            const val = String(is_read).toLowerCase();
            if (val === "true" || val === "1") {
                filters.isRead = true;
            } else if (val === "false" || val === "0") {
                filters.isRead = false;
            } else {
                return res.status(400).json({
                    message: "Invalid is_read filter. Must be true or false"
                });
            }
        }

        // Validate type parameter
        if (type !== undefined) {
            if (typeof type !== "string" || type.trim().length === 0 || type.length > 50) {
                return res.status(400).json({
                    message: "Invalid type filter"
                });
            }
            filters.type = type.trim();
        }

        // Validate limit parameter
        if (limit !== undefined) {
            const parsedLimit = Number(limit);
            if (!Number.isInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
                return res.status(400).json({
                    message: "Invalid pagination parameters: limit must be an integer between 1 and 100"
                });
            }
            filters.limit = parsedLimit;
        }

        // Validate offset parameter
        if (offset !== undefined) {
            const parsedOffset = Number(offset);
            if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
                return res.status(400).json({
                    message: "Invalid pagination parameters: offset must be a non-negative integer"
                });
            }
            filters.offset = parsedOffset;
        }

        const notifications = await getUserNotifications(userId, filters);

        return res.status(200).json({
            message: "Notifications retrieved successfully",
            count: notifications.length,
            notifications
        });

    } catch (error) {
        console.error("Get notifications error:", error.message);
        return res.status(500).json({
            message: "Failed to retrieve notifications"
        });
    }
};

// F-014: Get specific notification details
const getNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const id = validateNotificationId(req.params.id);

        if (!id) {
            return res.status(400).json({
                message: "Invalid notification ID"
            });
        }

        const notification = await getNotificationById(id, userId);

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        return res.status(200).json({
            message: "Notification retrieved successfully",
            notification
        });

    } catch (error) {
        console.error("Get notification error:", error.message);
        return res.status(500).json({
            message: "Failed to retrieve notification"
        });
    }
};

// F-014: Mark notification as read
const markRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const id = validateNotificationId(req.params.id);

        if (!id) {
            return res.status(400).json({
                message: "Invalid notification ID"
            });
        }

        const updated = await markNotificationAsRead(id, userId);

        if (!updated) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        return res.status(200).json({
            message: "Notification marked as read successfully",
            notification: updated
        });

    } catch (error) {
        console.error("Mark notification read error:", error.message);
        return res.status(500).json({
            message: "Failed to update notification"
        });
    }
};

module.exports = {
    getMyNotifications,
    getNotification,
    markRead
};
