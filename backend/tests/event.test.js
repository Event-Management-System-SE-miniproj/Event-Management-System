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

    test("TC-EVT-02: Unauthorized Update Event", async () => {
        const response = await request(app)
            .put(`/api/events/${createdEventId}`)
            .send({
                organizer_id: 2,
                title: "Unauthorized Update",
                description: "This update should fail",
                event_date: "2026-12-12",
                event_time: "12:00",
                venue: "Unauthorized Venue",
                capacity: 200,
                registration_open: true
            });

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe(
            "Event not found or organizer is not authorized"
        );
    });

    test("TC-EVT-02: Delete Event", async () => {
        const response = await request(app)
            .delete(`/api/events/${createdEventId}`)
            .send({
                organizer_id: 1
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Event deleted successfully");
        expect(response.body.event.id).toBe(createdEventId);
    });

    test("TC-EVT-02: Unauthorized Delete Event", async () => {
        const createResponse = await request(app)
            .post("/api/events")
            .send({
                organizer_id: 1,
                title: "Authorization Test Event",
                description: "Temporary test event",
                event_date: "2026-12-15",
                event_time: "14:00",
                venue: "PES University",
                capacity: 50,
                registration_open: true
            });

        const testEventId = createResponse.body.event.id;

        const response = await request(app)
            .delete(`/api/events/${testEventId}`)
            .send({
                organizer_id: 2
            });

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe(
            "Event not found or organizer is not authorized"
        );

        // Clean up the temporary event using the correct organizer
        await request(app)
            .delete(`/api/events/${testEventId}`)
            .send({
                organizer_id: 1
            });
    });

});

afterAll(async () => {
    await pool.end();
});