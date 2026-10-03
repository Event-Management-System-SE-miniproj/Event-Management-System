const express = require("express");

const {
    createEvent,
    updateEvent,
    deleteEvent,
    getEvents,
    getEventById
} = require("../controllers/eventController");

const router = express.Router();

// F-004: Create Event
router.post("/", createEvent);

// F-005: Update Event
router.put("/:id", updateEvent);

// F-005: Delete Event
router.delete("/:id", deleteEvent);


// F-006: Search and Filter Events
router.get("/", getEvents);

// F-007: View Event Details
router.get("/:id", getEventById);

module.exports = router;