const express = require("express");
const {
    processPayment,
    getPaymentByRegistration
} = require("../controllers/paymentController");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// F-010: Process payment (UPI payment)
router.post("/", processPayment);

// F-010: Retrieve payment details for a specific registration
router.get("/registration/:registrationId", authenticateToken, getPaymentByRegistration);

module.exports = router;
