const express = require("express");
const {
    getTicket
} = require("../controllers/ticketController");

const router = express.Router();

// F-011: Retrieve registration confirmation and ticket
router.get("/:registration_id", getTicket);

module.exports = router;