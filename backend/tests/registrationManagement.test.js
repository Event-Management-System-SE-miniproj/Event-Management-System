const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/database");

describe("F-012: Registration Viewing API", () => {
    let userId;
    let otherUserId;
    let eventId;
    let token;
    let otherToken;
    let registrationId;

    const testEmail = `f012_${Date.now()}@example.com`;
    const otherEmail = `f012_other_${Date.now()}@example.com`;
    const password = "Test@12345";

    beforeAll(async () => {
        // Create first test user
        const userResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "F012 Test User",
                email: testEmail,
                password
            });

        expect(userResponse.statusCode).toBe(201);
        userId = userResponse.body.user.id;

        // Create second test user
        const otherUserResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "F012 Other User",
                email: otherEmail,
                password
            });

        expect(otherUserResponse.statusCode).toBe(201);
        otherUserId = otherUserResponse.body.user.id;

        // Login first user
        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: testEmail,
                password
            });

        expect(loginResponse.statusCode).toBe(200);
        token = loginResponse.body.token;

        // Login second user
        const otherLoginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: otherEmail,
                password
            });

        expect(otherLoginResponse.statusCode).toBe(200);
        otherToken = otherLoginResponse.body.token;

        // Create test event
        const eventResult = await pool.query(
            `INSERT INTO events
             (organizer_id, title, description, event_date,
              event_time, venue, capacity, registration_open)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
                userId,
                "F012 Test Event",
                "Testing registration viewing",
                "2026-12-15",
                "18:00",
                "Test Hall",
                10,
                true
            ]
        );

        eventId = eventResult.rows[0].id;

        // Create registration for first user
        const registrationResult = await pool.query(
            `INSERT INTO registrations
             (event_id, user_id, status)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [eventId, userId, "REGISTERED"]
        );

        registrationId = registrationResult.rows[0].id;

        // Create registration for second user
        await pool.query(
            `INSERT INTO registrations
             (event_id, user_id, status)
             VALUES ($1, $2, $3)`,
            [eventId, otherUserId, "REGISTERED"]
        );
    });

    afterAll(async () => {
        if (eventId) {
            await pool.query(
                "DELETE FROM registrations WHERE event_id = $1",
                [eventId]
            );

            await pool.query(
                "DELETE FROM events WHERE id = $1",
                [eventId]
            );
        }

        if (userId && otherUserId) {
            await pool.query(
                "DELETE FROM users WHERE id IN ($1, $2)",
                [userId, otherUserId]
            );
        }

        await pool.end();
    });

    test("TC-F012-01: Authenticated user can view registrations", async () => {
        const response = await request(app)
            .get("/api/registrations/my")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe(
            "Registrations retrieved successfully"
        );

        expect(response.body.registrations).toHaveLength(1);
        expect(response.body.registrations[0].registration_id)
            .toBe(registrationId);
        expect(response.body.registrations[0].event_title)
            .toBe("F012 Test Event");
    });

    test("TC-F012-02: User can only view their own registrations", async () => {
        const response = await request(app)
            .get("/api/registrations/my")
            .set("Authorization", `Bearer ${otherToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.registrations).toHaveLength(1);

        expect(response.body.registrations[0].registration_id)
            .not.toBe(registrationId);
    });

    test("TC-F012-03: Reject request without authentication", async () => {
        const response = await request(app)
            .get("/api/registrations/my");

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe(
            "Authentication token is required"
        );
    });
});
