
const express = require("express");

const {
    registerForEvent,
    getMyRegistrations,
    cancelRegistration
} = require("../controllers/registrationController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// F-008/F-009: Register for an event
router.post("/", registerForEvent);

// F-012: View authenticated user's registrations
router.get("/my", authenticateToken, getMyRegistrations);

// F-012: Cancel an authenticated user's registration
router.patch("/:id/cancel", authenticateToken, cancelRegistration);

module.exports = router;
