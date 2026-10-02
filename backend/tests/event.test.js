const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/database");

describe("Event Management API", () => {

    let createdEventId;

    test("TC-EVT-01: Create Event", async () => {
        const response = await request(app)
            .post("/api/events")
            .send({
                organizer_id: 1,
                title: "Automated Test Event",
                description: "Event created through automated testing",
                event_date: "2026-12-10",
                event_time: "10:00",
                venue: "PES University",
                capacity: 100,
                registration_open: true
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe("Event created successfully");
        expect(response.body.event).toHaveProperty("id");

        createdEventId = response.body.event.id;
    });

    test("TC-EVT-02: Update Event", async () => {
        const response = await request(app)
            .put(`/api/events/${createdEventId}`)
            .send({
                organizer_id: 1,
                title: "Automated Test Event Updated",
                description: "Updated through automated testing",
                event_date: "2026-12-11",
                event_time: "11:00",
                venue: "PES University - Updated Venue",
                capacity: 150,
                registration_open: true
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Event updated successfully");
        expect(response.body.event.title).toBe(
            "Automated Test Event Updated"
        );
        expect(response.body.event.capacity).toBe(150);
    });

});
afterAll(async () => {
    await pool.end();
});