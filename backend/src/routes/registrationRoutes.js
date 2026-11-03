const express = require("express");

const {
    registerForEvent,
    getMyRegistrations,
    getUserRegistrations,
    cancelRegistration,
    getEventParticipants
} = require("../controllers/registrationController");
const { getTicket } = require("../controllers/ticketController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// F-008/F-009: Register for an event
router.post("/", registerForEvent);

// F-012: View own registrations
router.get("/my", authenticateToken, getMyRegistrations);

// F-012: View registrations of specific user (Self or Admin)
router.get("/user/:userId", authenticateToken, getUserRegistrations);

// F-012: Cancel registration (supports both DELETE and PATCH /cancel)
router.delete("/:id", authenticateToken, cancelRegistration);
router.patch("/:id/cancel", authenticateToken, cancelRegistration);

// F-013: Organizer views event participants (supports both /event/:eventId and /event/:eventId/participants)
router.get("/event/:eventId", authenticateToken, getEventParticipants);
router.get(
    "/event/:eventId/participants",
    authenticateToken,
    getEventParticipants
);

// F-011: Retrieve ticket for a registration
router.get("/:registration_id/ticket", authenticateToken, getTicket);

module.exports = router;
