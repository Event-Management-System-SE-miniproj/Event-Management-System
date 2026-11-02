
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const pool = require("../config/database");

describe("Event Management API", () => {
    let createdEventId;
    let organizerId;
    let otherOrganizerId;
    let organizerToken;
    let otherOrganizerToken;

    beforeAll(async () => {
        const organizer = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
                "Event Test Organizer",
                `eventorganizer_${Date.now()}@test.com`,
                "test_hash",
                "organizer",
                "ACTIVE"
            ]
        );

        organizerId = organizer.rows[0].id;

        const otherOrganizer = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
                "Other Event Organizer",
                `otherorganizer_${Date.now()}@test.com`,
                "test_hash",
                "organizer",
                "ACTIVE"
            ]
        );

        otherOrganizerId = otherOrganizer.rows[0].id;

        organizerToken = jwt.sign(
            {
                id: organizerId,
                role: "organizer"
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        otherOrganizerToken = jwt.sign(
            {
                id: otherOrganizerId,
                role: "organizer"
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
    });

    test("TC-EVT-01: Create Event", async () => {
        const response = await request(app)
            .post("/api/events")
            .set("Authorization", `Bearer ${organizerToken}`)
            .send({
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
        expect(Number(response.body.event.organizer_id)).toBe(Number(organizerId));
    });

    test("TC-EVT-02: Update Event", async () => {
        const response = await request(app)
            .put(`/api/events/${createdEventId}`)
            .set("Authorization", `Bearer ${organizerToken}`)
            .send({
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

    test("TC-EVT-02: Another organizer cannot update the event", async () => {
        const response = await request(app)
            .put(`/api/events/${createdEventId}`)
            .set("Authorization", `Bearer ${otherOrganizerToken}`)
            .send({
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
            .set("Authorization", `Bearer ${organizerToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Event deleted successfully");
        expect(response.body.event.id).toBe(createdEventId);

        createdEventId = null;
    });

    test("TC-EVT-02: Another organizer cannot delete an event", async () => {
        const createResponse = await request(app)
            .post("/api/events")
            .set("Authorization", `Bearer ${organizerToken}`)
            .send({
                title: "Authorization Test Event",
                description: "Temporary test event",
                event_date: "2026-12-15",
                event_time: "14:00",
                venue: "PES University",
                capacity: 50,
                registration_open: true
            });

        expect(createResponse.statusCode).toBe(201);

        const testEventId = createResponse.body.event.id;

        const response = await request(app)
            .delete(`/api/events/${testEventId}`)
            .set("Authorization", `Bearer ${otherOrganizerToken}`);

        expect(response.statusCode).toBe(404);

        // Clean up using the correct organizer
        const cleanup = await request(app)
            .delete(`/api/events/${testEventId}`)
            .set("Authorization", `Bearer ${organizerToken}`);

        expect(cleanup.statusCode).toBe(200);
    });

    afterAll(async () => {
        if (createdEventId) {
            await pool.query(
                "DELETE FROM events WHERE id = $1",
                [createdEventId]
            );
        }

        if (organizerId || otherOrganizerId) {
            await pool.query(
                "DELETE FROM users WHERE id = ANY($1::int[])",
                [[organizerId, otherOrganizerId].filter(Boolean)]
            );
        }

        await pool.end();
    });
});
