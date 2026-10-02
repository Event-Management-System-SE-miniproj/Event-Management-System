const express = require("express");

const {
    registerUser
} = require("../controllers/authController");

const router = express.Router();

// F-001: User Account Creation
router.post("/register", registerUser);

module.exports = router;