
const express = require("express");

const {
    registerForEvent,
    getMyRegistrations
} = require("../controllers/registrationController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// F-008/F-009: Register for Event + Enforce Capacity
router.post("/", registerForEvent);

// F-012: View authenticated user's registrations
router.get("/my", authenticateToken, getMyRegistrations);

module.exports = router;
