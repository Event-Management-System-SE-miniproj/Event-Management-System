const express = require("express");

const eventRoutes = require("./routes/eventRoutes");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();

app.use(express.json());

// Gokul's event APIs
app.use("/api/events", eventRoutes);

// Aaryesh's authentication APIs
app.use("/api/auth", authRoutes);


app.use("/api/users", profileRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Event Management System API is running"
    });
});

module.exports = app;