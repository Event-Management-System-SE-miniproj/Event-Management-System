const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");

const {
    getProfile,
    updateProfile
} = require("../controllers/profileController");

const router = express.Router();

// F-003: View Profile
router.get(
    "/profile",
    authenticateToken,
    getProfile
);

// F-003: Update Profile
router.put(
    "/profile",
    authenticateToken,
    updateProfile
);

module.exports = router;