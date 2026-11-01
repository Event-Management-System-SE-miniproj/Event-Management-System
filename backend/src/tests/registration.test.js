const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/database");

describe("Event Registration API", () => {
    let eventId;

    beforeAll(async () => {
        const result = await pool.query(
            `INSERT INTO events
            (organizer_id, title, description, event_date, event_time,
             venue, capacity, registration_open)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
                1,
                "Registration Test Event",
                "Testing F-008 and F-009",
                "2026-10-15",
                "18:00",
                "Test Hall",
                2,
                true
            ]
        );

        eventId = result.rows[0].id;
    });

    afterAll(async () => {
        await pool.query(
            "DELETE FROM events WHERE id = $1",
            [eventId]
        );

        await pool.end();
    });

    test("TC-REG-02: Register when capacity is available", async () => {
        const response = await request(app)
            .post("/api/registrations")
            .send({
                event_id: eventId,
                user_id: 201
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe(
            "Registration successful"
        );
    });

    test("TC-REG-03: Reject registration when capacity is reached", async () => {
        const secondResponse = await request(app)
            .post("/api/registrations")
            .send({
                event_id: eventId,
                user_id: 202
            });

        expect(secondResponse.statusCode).toBe(201);

        const thirdResponse = await request(app)
            .post("/api/registrations")
            .send({
                event_id: eventId,
                user_id: 203
            });

        expect(thirdResponse.statusCode).toBe(400);
        expect(thirdResponse.body.message).toBe(
            "Event capacity has been reached"
        );
    });

    test("TC-REG-03: Reject registration when registration is closed", async () => {
        await pool.query(
            `UPDATE events
             SET registration_open = false
             WHERE id = $1`,
            [eventId]
        );

        const response = await request(app)
            .post("/api/registrations")
            .send({
                event_id: eventId,
                user_id: 204
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe(
            "Registration is closed for this event"
        );
    });
});