const express = require("express");

const eventRoutes = require("./routes/eventRoutes");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const registrationRoutes = require("./routes/registrationRoutes");

const app = express();

app.use(express.json());

// Gokul's event APIs
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);

// Aaryesh's authentication APIs
app.use("/api/auth", authRoutes);

app.use("/api/users", profileRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Event Management System API is running"
    });
});

module.exports = app;