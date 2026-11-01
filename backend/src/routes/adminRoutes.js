const express = require("express");
const {
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
} = require("../controllers/adminController");
const { authenticateToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Enforce admin authentication & authorization for all admin endpoints
router.use(authenticateToken, requireAdmin);

// User Management APIs (F-015)
router.get("/users", getAllUsers);
router.get("/users/:id", getUserDetails);
router.patch("/users/:id/status", setUserStatus);
router.patch("/users/:id/disable", disableUser);
router.patch("/users/:id/enable", enableUser);
router.patch("/users/:id", updateUser);

// Event Approval & Disabling APIs (F-015)
router.get("/events", getAdminEvents);
router.patch("/events/:id/approve", approveEvent);
router.patch("/events/:id/disable", disableEvent);
router.patch("/events/:id/enable", enableEvent);

// System Activity & Audit Logging APIs (F-015)
router.get("/audit-logs", getAuditLogsList);
router.get("/audit-logs/:id", getAuditLog);

module.exports = router;
