const express = require("express");
const {
    processPayment
} = require("../controllers/paymentController");

const router = express.Router();

// F-010: Process mock payment
router.post("/", processPayment);

module.exports = router;