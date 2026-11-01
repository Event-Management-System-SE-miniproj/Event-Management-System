
const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../app");
const pool = require("../config/database");

describe("EMS-F-015: Administrative Management & Audit Logging", () => {
    let adminId;
    let organizerId;
    let regularUserId;
    let targetUserId;

    let adminToken;
    let organizerToken;
    let userToken;
    let targetUserToken;

    let activeEventId;
    let pendingEventId;
    let eventToDisableId;

    const timestamp = Date.now();
    const adminEmail = `admin_${timestamp}@example.com`;
    const organizerEmail = `organizer_admin_${timestamp}@example.com`;
    const userEmail = `user_admin_${timestamp}@example.com`;
    const targetUserEmail = `target_user_${timestamp}@example.com`;
    const defaultPassword = "AdminSecurePassword123!";

    beforeAll(async () => {
        const initDb = require("../config/initDb");
        await initDb();

        // Roles are stored in lowercase in PostgreSQL.
        // The users.role CHECK constraint must allow:
        // user, organizer, admin.
        const passwordHash = await bcrypt.hash(defaultPassword, 12);

        // 1. Create ADMIN user
        const adminRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status)
             VALUES ($1, $2, $3, 'admin', 'ACTIVE')
             RETURNING id`,
            ["Main Administrator", adminEmail, passwordHash]
        );
        adminId = adminRes.rows[0].id;

        // 2. Create ORGANIZER user
        const orgRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status)
             VALUES ($1, $2, $3, 'organizer', 'ACTIVE')
             RETURNING id`,
            ["Event Organizer", organizerEmail, passwordHash]
        );
        organizerId = orgRes.rows[0].id;

        // 3. Create regular USER
        const userRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status)
             VALUES ($1, $2, $3, 'user', 'ACTIVE')
             RETURNING id`,
            ["Regular Attendee", userEmail, passwordHash]
        );
        regularUserId = userRes.rows[0].id;

        // 4. Create target USER
        const targetRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status)
             VALUES ($1, $2, $3, 'user', 'ACTIVE')
             RETURNING id`,
            ["Target Managed User", targetUserEmail, passwordHash]
        );
        targetUserId = targetRes.rows[0].id;

        // Obtain JWT tokens for each role
        const adminLogin = await request(app)
            .post("/api/auth/login")
            .send({ email: adminEmail, password: defaultPassword });
        adminToken = adminLogin.body.token;

        const orgLogin = await request(app)
            .post("/api/auth/login")
            .send({ email: organizerEmail, password: defaultPassword });
        organizerToken = orgLogin.body.token;

        const userLogin = await request(app)
            .post("/api/auth/login")
            .send({ email: userEmail, password: defaultPassword });
        userToken = userLogin.body.token;

        const targetLogin = await request(app)
            .post("/api/auth/login")
            .send({ email: targetUserEmail, password: defaultPassword });
        targetUserToken = targetLogin.body.token;

        // Create sample events
        const evt1 = await pool.query(
            `INSERT INTO events
                (organizer_id, title, description, event_date, event_time,
                 venue, capacity, registration_open, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [
                organizerId,
                "Admin Active Fest",
                "Normal active event",
                "2026-11-25",
                "10:00:00",
                "Main Stage",
                50,
                true,
                "ACTIVE"
            ]
        );
        activeEventId = evt1.rows[0].id;

        const evt2 = await pool.query(
            `INSERT INTO events
                (organizer_id, title, description, event_date, event_time,
                 venue, capacity, registration_open, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [
                organizerId,
                "Pending Approval Summit",
                "Needs admin review",
                "2026-11-26",
                "11:00:00",
                "Hall 2",
                30,
                true,
                "PENDING_APPROVAL"
            ]
        );
        pendingEventId = evt2.rows[0].id;

        const evt3 = await pool.query(
            `INSERT INTO events
                (organizer_id, title, description, event_date, event_time,
                 venue, capacity, registration_open, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [
                organizerId,
                "Event To Be Disabled",
                "Will be disabled by admin",
                "2026-11-27",
                "12:00:00",
                "Hall 3",
                20,
                true,
                "ACTIVE"
            ]
        );
        eventToDisableId = evt3.rows[0].id;
    });

    // Authorization and access control

    test("Unauthenticated user is rejected from admin endpoints", async () => {
        const res = await request(app).get("/api/admin/users");

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toContain("token is required");
    });

    test("Regular user is rejected from administrator-only APIs", async () => {
        const res = await request(app)
            .get("/api/admin/users")
            .set("Authorization", `Bearer ${userToken}`);

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe("Administrator access required");
    });

    test("Organizer is rejected from administrator-only actions", async () => {
        const res = await request(app)
            .get("/api/admin/users")
            .set("Authorization", `Bearer ${organizerToken}`);

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe("Administrator access required");

        const disableRes = await request(app)
            .patch(`/api/admin/events/${eventToDisableId}/disable`)
            .set("Authorization", `Bearer ${organizerToken}`);

        expect(disableRes.statusCode).toBe(403);
    });

    test("Administrator can access authorized endpoints", async () => {
        const res = await request(app)
            .get("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Users retrieved successfully");
        expect(Array.isArray(res.body.users)).toBe(true);
    });

    test("Admin events endpoint enforces role-based authorization", async () => {
        const unauthRes = await request(app).get("/api/admin/events");

        expect(unauthRes.statusCode).toBe(401);

        const userRes = await request(app)
            .get("/api/admin/events")
            .set("Authorization", `Bearer ${userToken}`);

        expect(userRes.statusCode).toBe(403);

        const orgRes = await request(app)
            .get("/api/admin/events")
            .set("Authorization", `Bearer ${organizerToken}`);

        expect(orgRes.statusCode).toBe(403);

        const adminRes = await request(app)
            .get("/api/admin/events")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(adminRes.statusCode).toBe(200);
        expect(Array.isArray(adminRes.body.events)).toBe(true);
    });

    test("Event approval enforces role-based authorization", async () => {
        const unauthRes = await request(app)
            .patch(`/api/admin/events/${pendingEventId}/approve`);

        expect(unauthRes.statusCode).toBe(401);

        const userRes = await request(app)
            .patch(`/api/admin/events/${pendingEventId}/approve`)
            .set("Authorization", `Bearer ${userToken}`);

        expect(userRes.statusCode).toBe(403);

        const orgRes = await request(app)
            .patch(`/api/admin/events/${pendingEventId}/approve`)
            .set("Authorization", `Bearer ${organizerToken}`);

        expect(orgRes.statusCode).toBe(403);
    });

    test("User status management enforces role-based authorization", async () => {
        const unauthRes = await request(app)
            .patch(`/api/admin/users/${targetUserId}/status`)
            .send({ status: "DISABLED" });

        expect(unauthRes.statusCode).toBe(401);

        const userRes = await request(app)
            .patch(`/api/admin/users/${targetUserId}/status`)
            .set("Authorization", `Bearer ${userToken}`)
            .send({ status: "DISABLED" });

        expect(userRes.statusCode).toBe(403);

        const orgRes = await request(app)
            .patch(`/api/admin/users/${targetUserId}/status`)
            .set("Authorization", `Bearer ${organizerToken}`)
            .send({ status: "DISABLED" });

        expect(orgRes.statusCode).toBe(403);
    });

    test("Malformed tokens are rejected", async () => {
        const res = await request(app)
            .get("/api/admin/users")
            .set("Authorization", "Bearer invalid.token.value");

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toContain("Invalid or expired");
    });

    // User management and password protection

    test("Admin retrieves user records without password hashes", async () => {
        const res = await request(app)
            .get("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.users.length).toBeGreaterThan(0);

        for (const user of res.body.users) {
            expect(user.password_hash).toBeUndefined();
            expect(user.password).toBeUndefined();
            expect(user.id).toBeDefined();
            expect(user.name).toBeDefined();
            expect(user.email).toBeDefined();
            expect(user.role).toBeDefined();
            expect(user.status).toBeDefined();
        }

        const singleRes = await request(app)
            .get(`/api/admin/users/${targetUserId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(singleRes.statusCode).toBe(200);
        expect(singleRes.body.user.password_hash).toBeUndefined();
        expect(singleRes.body.user.id).toBe(targetUserId);
        expect(singleRes.body.user.total_registrations).toBeDefined();
    });

    // Pagination

    test("Admin user listing supports pagination", async () => {
        const defaultRes = await request(app)
            .get("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(defaultRes.statusCode).toBe(200);
        expect(defaultRes.body.page).toBe(1);
        expect(defaultRes.body.limit).toBe(20);
        expect(defaultRes.body.total).toBeGreaterThanOrEqual(4);
        expect(defaultRes.body.totalPages).toBeGreaterThanOrEqual(1);

        const paginatedRes = await request(app)
            .get("/api/admin/users?page=1&limit=2")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(paginatedRes.statusCode).toBe(200);
        expect(paginatedRes.body.page).toBe(1);
        expect(paginatedRes.body.limit).toBe(2);
        expect(paginatedRes.body.users.length).toBeLessThanOrEqual(2);

        const page2Res = await request(app)
            .get("/api/admin/users?page=2&limit=2")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(page2Res.statusCode).toBe(200);
        expect(page2Res.body.page).toBe(2);
        expect(page2Res.body.limit).toBe(2);

        const invalidPageRes = await request(app)
            .get("/api/admin/users?page=invalid")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(invalidPageRes.statusCode).toBe(400);
        expect(invalidPageRes.body.message).toContain("Invalid page parameter");

        const invalidLimitRes = await request(app)
            .get("/api/admin/users?limit=-5")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(invalidLimitRes.statusCode).toBe(400);
        expect(invalidLimitRes.body.message).toContain("Invalid limit parameter");
    });

    // Disable and re-enable users

    test("Admin can disable a user and block login and registration", async () => {
        const disableRes = await request(app)
            .patch(`/api/admin/users/${targetUserId}/disable`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(disableRes.statusCode).toBe(200);
        expect(disableRes.body.user.status).toBe("DISABLED");

        const dbUser = await pool.query(
            "SELECT status FROM users WHERE id = $1",
            [targetUserId]
        );

        expect(dbUser.rows[0].status).toBe("DISABLED");

        const loginAttempt = await request(app)
            .post("/api/auth/login")
            .send({ email: targetUserEmail, password: defaultPassword });

        expect(loginAttempt.statusCode).toBe(403);
        expect(loginAttempt.body.message).toContain("Account is disabled");

        const regAttempt = await request(app)
            .post("/api/registrations")
            .send({
                event_id: activeEventId,
                user_id: targetUserId
            });

        expect(regAttempt.statusCode).toBe(403);
        expect(regAttempt.body.message).toContain("Disabled user account");
    });

    test("Admin can re-enable a previously disabled user", async () => {
        const enableRes = await request(app)
            .patch(`/api/admin/users/${targetUserId}/enable`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(enableRes.statusCode).toBe(200);
        expect(enableRes.body.user.status).toBe("ACTIVE");

        const dbUser = await pool.query(
            "SELECT status FROM users WHERE id = $1",
            [targetUserId]
        );

        expect(dbUser.rows[0].status).toBe("ACTIVE");

        const loginAttempt = await request(app)
            .post("/api/auth/login")
            .send({ email: targetUserEmail, password: defaultPassword });

        expect(loginAttempt.statusCode).toBe(200);
        expect(loginAttempt.body.token).toBeDefined();
    });

    // Event approval and moderation

    test("Admin can approve a pending event", async () => {
        const approveRes = await request(app)
            .patch(`/api/admin/events/${pendingEventId}/approve`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(approveRes.statusCode).toBe(200);
        expect(approveRes.body.event.status).toBe("ACTIVE");

        const dbEvt = await pool.query(
            "SELECT status FROM events WHERE id = $1",
            [pendingEventId]
        );

        expect(dbEvt.rows[0].status).toBe("ACTIVE");
    });

    test("Admin can disable an event", async () => {
        const disableRes = await request(app)
            .patch(`/api/admin/events/${eventToDisableId}/disable`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(disableRes.statusCode).toBe(200);
        expect(disableRes.body.event.status).toBe("DISABLED");

        const dbEvt = await pool.query(
            "SELECT status FROM events WHERE id = $1",
            [eventToDisableId]
        );

        expect(dbEvt.rows[0].status).toBe("DISABLED");

        const publicEvents = await request(app).get("/api/events");

        expect(publicEvents.statusCode).toBe(200);

        const disabledInListing = publicEvents.body.events.find(
            (event) => event.id === eventToDisableId
        );

        expect(disabledInListing).toBeUndefined();
    });

    test("Disabled events cannot be registered for", async () => {
        const regRes = await request(app)
            .post("/api/registrations")
            .send({
                event_id: eventToDisableId,
                user_id: regularUserId
            });

        expect(regRes.statusCode).toBe(400);
        expect(regRes.body.message).toContain("disabled event");
    });

    test("Admin can re-enable a disabled event", async () => {
        const enableRes = await request(app)
            .patch(`/api/admin/events/${eventToDisableId}/enable`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(enableRes.statusCode).toBe(200);
        expect(enableRes.body.event.status).toBe("ACTIVE");

        const regRes = await request(app)
            .post("/api/registrations")
            .send({
                event_id: eventToDisableId,
                user_id: regularUserId
            });

        expect(regRes.statusCode).toBe(201);
        expect(regRes.body.message).toBe("Registration successful");
    });

    // Audit logging

    test("Administrative actions generate audit log records", async () => {
        const auditRes = await request(app)
            .get("/api/admin/audit-logs")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(auditRes.statusCode).toBe(200);
        expect(Array.isArray(auditRes.body.logs)).toBe(true);
        expect(auditRes.body.logs.length).toBeGreaterThanOrEqual(4);

        const actionsLogged = auditRes.body.logs.map((log) => log.action);

        expect(actionsLogged).toContain("USER_DISABLE");
        expect(actionsLogged).toContain("USER_ENABLE");
        expect(actionsLogged).toContain("EVENT_APPROVE");
        expect(actionsLogged).toContain("EVENT_DISABLE");

        for (const log of auditRes.body.logs) {
            expect(Number(log.admin_id)).toBe(Number(adminId));
            expect(log.created_at).toBeDefined();
            expect(log.status).toBe("SUCCESS");

            if (log.details) {
                expect(log.details).not.toContain("password_hash");
                expect(log.details).not.toContain(defaultPassword);
            }
        }
    });

    test("Audit logs are accessible only to authorized administrators", async () => {
        const noAuth = await request(app).get("/api/admin/audit-logs");

        expect(noAuth.statusCode).toBe(401);

        const userAccess = await request(app)
            .get("/api/admin/audit-logs")
            .set("Authorization", `Bearer ${userToken}`);

        expect(userAccess.statusCode).toBe(403);

        const orgAccess = await request(app)
            .get("/api/admin/audit-logs")
            .set("Authorization", `Bearer ${organizerToken}`);

        expect(orgAccess.statusCode).toBe(403);
    });

    test("Audit log retrieval supports filters and validates parameters", async () => {
        const actionRes = await request(app)
            .get("/api/admin/audit-logs?action=USER_DISABLE")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(actionRes.statusCode).toBe(200);
        expect(actionRes.body.logs.length).toBeGreaterThan(0);

        for (const log of actionRes.body.logs) {
            expect(log.action).toBe("USER_DISABLE");
        }

        const statusRes = await request(app)
            .get("/api/admin/audit-logs?status=SUCCESS")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(statusRes.statusCode).toBe(200);

        for (const log of statusRes.body.logs) {
            expect(log.status).toBe("SUCCESS");
        }

        const adminRes = await request(app)
            .get(`/api/admin/audit-logs?adminId=${adminId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(adminRes.statusCode).toBe(200);

        for (const log of adminRes.body.logs) {
            expect(Number(log.admin_id)).toBe(Number(adminId));
        }

        const today = new Date().toISOString().split("T")[0];

        const dateRes = await request(app)
            .get(`/api/admin/audit-logs?startDate=${today}&endDate=${today}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(dateRes.statusCode).toBe(200);
        expect(Array.isArray(dateRes.body.logs)).toBe(true);

        const badDateRes = await request(app)
            .get("/api/admin/audit-logs?startDate=not-a-date")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(badDateRes.statusCode).toBe(400);
        expect(badDateRes.body.message).toContain("Invalid startDate format");

        const badAdminIdRes = await request(app)
            .get("/api/admin/audit-logs?adminId=-1")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(badAdminIdRes.statusCode).toBe(400);
        expect(badAdminIdRes.body.message).toContain("Invalid adminId parameter");
    });

    // Existing functionality regression test

    test("Existing event and registration functionality continues to work", async () => {
        const adminEvents = await request(app)
            .get("/api/admin/events")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(adminEvents.statusCode).toBe(200);
        expect(adminEvents.body.events.length).toBeGreaterThanOrEqual(3);

        const evtDetail = await request(app)
            .get(`/api/events/${activeEventId}`);

        expect(evtDetail.statusCode).toBe(200);
        expect(evtDetail.body.event.title).toBe("Admin Active Fest");
    });

    afterAll(async () => {
        // Clean up only records created by this test.
        if (adminId) {
            await pool.query(
                "DELETE FROM audit_logs WHERE admin_id = $1",
                [adminId]
            );
        }

        const eventIds = [
            activeEventId,
            pendingEventId,
            eventToDisableId
        ].filter(Boolean);

        if (eventIds.length > 0) {
            await pool.query(
                "DELETE FROM registrations WHERE event_id = ANY($1::int[])",
                [eventIds]
            );

            await pool.query(
                "DELETE FROM events WHERE id = ANY($1::int[])",
                [eventIds]
            );
        }

        const userIds = [
            adminId,
            organizerId,
            regularUserId,
            targetUserId
        ].filter(Boolean);

        if (userIds.length > 0) {
            await pool.query(
                "DELETE FROM users WHERE id = ANY($1::int[])",
                [userIds]
            );
        }

        await pool.end();
    });
});
