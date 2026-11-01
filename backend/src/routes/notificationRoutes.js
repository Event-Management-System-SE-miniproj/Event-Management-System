const express = require("express");
const {
    getMyNotifications,
    getNotification,
    markRead
} = require("../controllers/notificationController");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// F-014: View authenticated user's notifications
router.get("/", authenticateToken, getMyNotifications);

// F-014: View a specific notification
router.get("/:id", authenticateToken, getNotification);

// F-014: Mark notification as read
router.patch("/:id/read", authenticateToken, markRead);

module.exports = router;
