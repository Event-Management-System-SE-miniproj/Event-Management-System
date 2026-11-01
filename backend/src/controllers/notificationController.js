const {
    getUserNotifications,
    getNotificationById,
    markNotificationAsRead
} = require("../services/notificationService");

// F-014: Get all notifications for authenticated user
const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await getUserNotifications(userId);

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
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
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
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
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
