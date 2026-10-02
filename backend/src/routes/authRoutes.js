const express = require("express");

const {
    registerUser,
    loginUser
} = require("../controllers/authController");

const router = express.Router();

// F-001: User Account Creation
router.post("/register", registerUser);

// F-002: User Authentication
router.post("/login", loginUser);

module.exports = router;