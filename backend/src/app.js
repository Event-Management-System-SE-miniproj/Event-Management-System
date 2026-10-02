const express = require("express");
const eventRoutes = require("./routes/eventRoutes");

const app = express();

app.use(express.json());

app.use("/api/events", eventRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Event Management System API is running"
    });
});

module.exports = app;