const express = require("express");

const {
    createEvent,
    updateEvent,
    deleteEvent
} = require("../controllers/eventController");

const router = express.Router();

// F-004: Create Event
router.post("/", createEvent);

// F-005: Update Event
router.put("/:id", updateEvent);

// F-005: Delete Event
router.delete("/:id", deleteEvent);

module.exports = router;