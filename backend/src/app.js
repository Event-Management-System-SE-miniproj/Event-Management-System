const express = require("express");

const eventRoutes = require("./routes/eventRoutes");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const ticketRoutes = require("./routes/ticketRoutes");

const app = express();

app.use(express.json());

// Event APIs
app.use("/api/events", eventRoutes);

// Registration APIs: F-008 and F-009
app.use("/api/registrations", registrationRoutes);

// Authentication APIs
app.use("/api/auth", authRoutes);

// User profile APIs
app.use("/api/users", profileRoutes);

// F-010: Mock Payment Processing
app.use("/api/payments", paymentRoutes);

// F-011: Registration Confirmation and Ticket Generation
app.use("/api/tickets", ticketRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Event Management System API is running"
    });
});

module.exports = app;