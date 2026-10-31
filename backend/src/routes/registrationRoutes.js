
const express = require("express");

const {
    registerForEvent,
    getMyRegistrations,
    cancelRegistration,
    getEventParticipants
} = require("../controllers/registrationController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// F-008/F-009: Register for an event
router.post("/", registerForEvent);

// F-012: View own registrations
router.get("/my", authenticateToken, getMyRegistrations);

// F-012: Cancel own registration
router.patch("/:id/cancel", authenticateToken, cancelRegistration);

// F-013: Organizer views event participants
router.get(
    "/event/:eventId/participants",
    authenticateToken,
    getEventParticipants
);

module.exports = router;
