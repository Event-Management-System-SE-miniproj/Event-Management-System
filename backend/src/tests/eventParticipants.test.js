
const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/database");

describe("F-013: Event Participant Management API", () => {
    let organizerId;
    let otherOrganizerId;
    let userId;
    let eventId;
    let otherEventId;
    let organizerToken;
    let otherOrganizerToken;
    let userToken;
    let registrationId;

    const password = "Test@12345";
    const unique = Date.now();

    beforeAll(async () => {
        const createUser = async (name, role) => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    name,
                    email: `${name.replace(/\s/g, "").toLowerCase()}${unique}@example.com`,
                    password,
                    role
                });

            expect(response.statusCode).toBe(201);

            const login = await request(app)
                .post("/api/auth/login")
                .send({
                    email: response.body.user.email,
                    password
                });

            expect(login.statusCode).toBe(200);

            return {
                id: response.body.user.id,
                token: login.body.token
            };
        };

        const organizer = await createUser("F013 Organizer", "ORGANIZER");
        const otherOrganizer = await createUser("F013 Other Organizer", "ORGANIZER");
        const user = await createUser("F013 Participant", "USER");

        organizerId = organizer.id;
        organizerToken = organizer.token;
        otherOrganizerId = otherOrganizer.id;
        otherOrganizerToken = otherOrganizer.token;
        userId = user.id;
        userToken = user.token;

        const event = await pool.query(
            `INSERT INTO events
             (organizer_id, title, event_date, event_time,
              venue, capacity, registration_open)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [organizerId, "F013 Test Event", "2026-12-20",
                "18:00", "Test Hall", 20, true]
        );

        eventId = event.rows[0].id;

        const otherEvent = await pool.query(
            `INSERT INTO events
             (organizer_id, title, event_date, event_time,
              venue, capacity, registration_open)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [otherOrganizerId, "F013 Other Event", "2026-12-21",
                "18:00", "Other Hall", 20, true]
        );

        otherEventId = otherEvent.rows[0].id;

        const registration = await pool.query(
            `INSERT INTO registrations (event_id, user_id, status)
             VALUES ($1, $2, $3) RETURNING id`,
            [eventId, userId, "REGISTERED"]
        );

        registrationId = registration.rows[0].id;
    });

    afterAll(async () => {
        if (eventId || otherEventId) {
            await pool.query(
                "DELETE FROM registrations WHERE event_id = ANY($1::int[])",
                [[eventId, otherEventId].filter(Boolean)]
            );

            await pool.query(
                "DELETE FROM events WHERE id = ANY($1::int[])",
                [[eventId, otherEventId].filter(Boolean)]
            );
        }

        const ids = [organizerId, otherOrganizerId, userId].filter(Boolean);

        if (ids.length) {
            await pool.query(
                "DELETE FROM users WHERE id = ANY($1::int[])",
                [ids]
            );
        }

        await pool.end();
    });

    test("TC-F013-01: Organizer can view own event participants", async () => {
        const response = await request(app)
            .get(`/api/registrations/event/${eventId}/participants`)
            .set("Authorization", `Bearer ${organizerToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.event.id).toBe(eventId);
        expect(response.body.count).toBe(1);
        expect(response.body.participants[0].registration_id)
            .toBe(registrationId);
        expect(response.body.participants[0].participant_name)
            .toBe("F013 Participant");
    });

    test("TC-F013-02: Organizer cannot view another organizer's event", async () => {
        const response = await request(app)
            .get(`/api/registrations/event/${otherEventId}/participants`)
            .set("Authorization", `Bearer ${organizerToken}`);

        expect(response.statusCode).toBe(404);
    });

    test("TC-F013-03: Normal user cannot view participants", async () => {
        const response = await request(app)
            .get(`/api/registrations/event/${eventId}/participants`)
            .set("Authorization", `Bearer ${userToken}`);

        expect(response.statusCode).toBe(403);
    });

    test("TC-F013-04: Reject request without authentication", async () => {
        const response = await request(app)
            .get(`/api/registrations/event/${eventId}/participants`);

        expect(response.statusCode).toBe(401);
    });

    test("TC-F013-05: Reject invalid event ID", async () => {
        const response = await request(app)
            .get("/api/registrations/event/invalid/participants")
            .set("Authorization", `Bearer ${organizerToken}`);

        expect(response.statusCode).toBe(400);
    });

    test("TC-F013-06: Organizer can view event with no participants", async () => {
        const response = await request(app)
            .get(`/api/registrations/event/${otherEventId}/participants`)
            .set("Authorization", `Bearer ${otherOrganizerToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(0);
        expect(response.body.participants).toHaveLength(0);
    });
});
