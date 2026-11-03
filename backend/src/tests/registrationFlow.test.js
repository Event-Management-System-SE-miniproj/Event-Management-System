const request = require("supertest");
const app = require("../app");
const pool = require("../config/database");

describe("Registration, Dashboard, Roster & UPI Payment Integration Flow", () => {
    let organizerId, organizerToken;
    let otherOrganizerId, otherOrganizerToken;
    let userId, userToken;
    let adminId, adminToken;
    let eventId;
    let registrationId;
    let failRegistrationId;
    let cancelRegistrationId;

    const unique = Date.now();
    const password = "Test@Password123";

    beforeAll(async () => {
        const registerAndLogin = async (name, role) => {
            const email = `${name.replace(/\s/g, "").toLowerCase()}_${unique}_${Math.random().toString(36).substring(2, 6)}@test.com`;
            const regRes = await request(app)
                .post("/api/auth/register")
                .send({ name, email, password, role });

            expect(regRes.statusCode).toBe(201);
            const uId = regRes.body.user.id;

            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({ email, password });

            expect(loginRes.statusCode).toBe(200);

            return { id: uId, token: loginRes.body.token };
        };

        const org = await registerAndLogin("Flow Organizer", "ORGANIZER");
        organizerId = org.id;
        organizerToken = org.token;

        const otherOrg = await registerAndLogin("Other Flow Org", "ORGANIZER");
        otherOrganizerId = otherOrg.id;
        otherOrganizerToken = otherOrg.token;

        const u = await registerAndLogin("Flow User", "USER");
        userId = u.id;
        userToken = u.token;

        const adm = await registerAndLogin("Flow Admin", "ADMIN");
        adminId = adm.id;
        adminToken = adm.token;

        // Create test event
        const eventRes = await pool.query(
            `INSERT INTO events
             (organizer_id, title, description, event_date, event_time, venue, capacity, registration_open)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [organizerId, "UPI Integration Summit", "Testing UPI and Dashboard flow", "2026-12-25", "10:00", "Campus Auditorium", 50, true]
        );
        eventId = eventRes.rows[0].id;

        // Create initial registration in PENDING_PAYMENT
        const regRes = await pool.query(
            `INSERT INTO registrations (event_id, user_id, status)
             VALUES ($1, $2, 'PENDING_PAYMENT')
             RETURNING id`,
            [eventId, userId]
        );
        registrationId = regRes.rows[0].id;

        // Create another registration for failure test
        const failReg = await pool.query(
            `INSERT INTO registrations (event_id, user_id, status)
             VALUES ($1, $2, 'PENDING_PAYMENT')
             RETURNING id`,
            [eventId, adminId]
        );
        failRegistrationId = failReg.rows[0].id;

        // Create registration for cancellation test
        const cancelReg = await pool.query(
            `INSERT INTO registrations (event_id, user_id, status)
             VALUES ($1, $2, 'PENDING_PAYMENT')
             RETURNING id`,
            [eventId, otherOrganizerId]
        );
        cancelRegistrationId = cancelReg.rows[0].id;
    });

    afterAll(async () => {
        if (eventId) {
            await pool.query("DELETE FROM tickets WHERE registration_id IN ($1, $2, $3)", [registrationId, failRegistrationId, cancelRegistrationId]);
            await pool.query("DELETE FROM payments WHERE registration_id IN ($1, $2, $3)", [registrationId, failRegistrationId, cancelRegistrationId]);
            await pool.query("DELETE FROM registrations WHERE event_id = $1", [eventId]);
            await pool.query("DELETE FROM events WHERE id = $1", [eventId]);
        }

        const userIds = [organizerId, otherOrganizerId, userId, adminId].filter(Boolean);
        if (userIds.length > 0) {
            await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [userIds]);
        }

        await pool.end();
    });

    describe("User Dashboard & Registrations Endpoints", () => {
        test("GET /api/registrations/user/:userId - Authenticated user can fetch own registrations", async () => {
            const res = await request(app)
                .get(`/api/registrations/user/${userId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.registrations).toBeDefined();
            expect(res.body.registrations.length).toBeGreaterThanOrEqual(1);

            const found = res.body.registrations.find(r => (r.id || r.registration_id) === registrationId);
            expect(found).toBeDefined();
            expect(found.event_title).toBe("UPI Integration Summit");
            expect(found.status).toBe("PENDING_PAYMENT");
        });

        test("GET /api/registrations/user/:userId - Other non-admin user cannot access registrations", async () => {
            const res = await request(app)
                .get(`/api/registrations/user/${userId}`)
                .set("Authorization", `Bearer ${otherOrganizerToken}`);

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toMatch(/not authorized/i);
        });

        test("GET /api/registrations/user/:userId - Admin can access user registrations", async () => {
            const res = await request(app)
                .get(`/api/registrations/user/${userId}`)
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.registrations).toBeDefined();
        });
    });

    describe("Organizer Participant Roster Endpoints", () => {
        test("GET /api/registrations/event/:eventId - Organizer can view participant roster", async () => {
            const res = await request(app)
                .get(`/api/registrations/event/${eventId}`)
                .set("Authorization", `Bearer ${organizerToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.event.id).toBe(eventId);
            expect(res.body.participants).toBeDefined();
            expect(res.body.count).toBeGreaterThanOrEqual(1);

            const participant = res.body.participants.find(p => (p.registration_id || p.id) === registrationId);
            expect(participant).toBeDefined();
            expect(participant.participant_name || participant.name).toBe("Flow User");
            expect(participant.participant_email || participant.email).toBeDefined();
        });

        test("GET /api/registrations/event/:eventId - Other organizer cannot access event roster", async () => {
            const res = await request(app)
                .get(`/api/registrations/event/${eventId}`)
                .set("Authorization", `Bearer ${otherOrganizerToken}`);

            expect(res.statusCode).toBe(404);
        });
    });

    describe("UPI Payment Flow & Ticket Issuance", () => {
        test("POST /api/payments - Process valid UPI payment and issue ticket", async () => {
            const res = await request(app)
                .post("/api/payments")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    registration_id: registrationId,
                    amount: 25.00,
                    payment_method: "UPI",
                    upi_id: "attendee@okhdfcbank"
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toMatch(/successful/i);
            expect(res.body.payment).toBeDefined();
            expect(res.body.payment.payment_method).toBe("UPI");
            expect(res.body.payment.status).toBe("SUCCESS");
            expect(res.body.ticket).toBeDefined();
            expect(res.body.ticket.status).toBe("VALID");
            expect(res.body.ticket.ticket_code).toMatch(/^TKT-/);

            // Verify registration status in database is now REGISTERED
            const checkReg = await pool.query("SELECT status FROM registrations WHERE id = $1", [registrationId]);
            expect(checkReg.rows[0].status).toBe("REGISTERED");

            // Verify ticket in database
            const checkTicket = await pool.query("SELECT * FROM tickets WHERE registration_id = $1", [registrationId]);
            expect(checkTicket.rows.length).toBe(1);
            expect(checkTicket.rows[0].status).toBe("VALID");
        });

        test("POST /api/payments - Prevent duplicate payment for already paid registration", async () => {
            const res = await request(app)
                .post("/api/payments")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    registration_id: registrationId,
                    amount: 25.00,
                    payment_method: "UPI",
                    upi_id: "attendee@okhdfcbank"
                });

            expect(res.statusCode).toBe(409);
            expect(res.body.message).toMatch(/already been completed/i);
        });

        test("POST /api/payments - Handle simulated UPI failure without generating ticket", async () => {
            const res = await request(app)
                .post("/api/payments")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    registration_id: failRegistrationId,
                    amount: 25.00,
                    payment_method: "UPI",
                    upi_id: "fail@upi"
                });

            expect(res.statusCode).toBe(402);
            expect(res.body.message).toMatch(/failed/i);
            expect(res.body.payment.status).toBe("FAILED");
            expect(res.body.ticket).toBeUndefined();

            // Verify no valid ticket was created
            const checkTicket = await pool.query("SELECT * FROM tickets WHERE registration_id = $1", [failRegistrationId]);
            expect(checkTicket.rows.length).toBe(0);

            // Verify registration status is PAYMENT_FAILED
            const checkReg = await pool.query("SELECT status FROM registrations WHERE id = $1", [failRegistrationId]);
            expect(checkReg.rows[0].status).toBe("PAYMENT_FAILED");
        });

        test("GET /api/tickets/:registration_id - Retrieve ticket for confirmed registration", async () => {
            const res = await request(app)
                .get(`/api/tickets/${registrationId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.ticket).toBeDefined();
            expect(res.body.ticket.ticket_code).toMatch(/^TKT-/);
            expect(res.body.ticket.ticket_status).toBe("VALID");
            expect(res.body.ticket.attendee_name).toBe("Flow User");
        });

        test("GET /api/registrations/:registration_id/ticket - Retrieve ticket via registration route alias", async () => {
            const res = await request(app)
                .get(`/api/registrations/${registrationId}/ticket`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.ticket).toBeDefined();
            expect(res.body.ticket.ticket_code).toMatch(/^TKT-/);
        });

        test("DELETE /api/registrations/:id - Cancel registration and invalidate ticket", async () => {
            const res = await request(app)
                .delete(`/api/registrations/${registrationId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.registration.status).toBe("CANCELLED");

            // Verify ticket in DB is now CANCELLED
            const checkTicket = await pool.query("SELECT status FROM tickets WHERE registration_id = $1", [registrationId]);
            expect(checkTicket.rows[0].status).toBe("CANCELLED");
        });

        test("POST /api/payments - Reject payment for a cancelled registration", async () => {
            const res = await request(app)
                .post("/api/payments")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    registration_id: registrationId,
                    amount: 25.00,
                    payment_method: "UPI",
                    upi_id: "attendee@okhdfcbank"
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/cannot process payment for a cancelled registration/i);
        });
    });
});
