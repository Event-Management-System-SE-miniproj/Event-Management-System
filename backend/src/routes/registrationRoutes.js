const express = require("express");

const {
    registerForEvent
} = require("../controllers/registrationController");

const router = express.Router();

// F-008/F-009: Register for Event + Enforce Capacity
router.post("/", registerForEvent);

module.exports = router;