
const express = require("express");

const {
    createEvent,
    updateEvent,
    deleteEvent,
    getEvents,
    getMyEvents,
    getEventById
} = require("../controllers/eventController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// PROTECTED ORGANIZER ROUTES
// ==========================================

// Get all events belonging to logged-in organizer
router.get("/mine", authenticateToken, getMyEvents);

// Create event
router.post("/", authenticateToken, createEvent);

// Update event
router.put("/:id", authenticateToken, updateEvent);

// Delete event
router.delete("/:id", authenticateToken, deleteEvent);

// ==========================================
// PUBLIC EVENT ROUTES
// ==========================================

// Get all active upcoming events
router.get("/", getEvents);

// Get event details
router.get("/:id", getEventById);

module.exports = router;
