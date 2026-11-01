const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const pool = require("../src/config/database");

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
        const initDb = require("../src/config/initDb");
        await initDb();

        // Hash password for users
        const passwordHash = await bcrypt.hash(defaultPassword, 12);

        // 1. Create ADMIN user directly in DB
        const adminRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status)
             VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE')
             RETURNING id`,
            ["Main Administrator", adminEmail, passwordHash]
        );
        adminId = adminRes.rows[0].id;

        // 2. Create ORGANIZER user
        const orgRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status)
             VALUES ($1, $2, $3, 'ORGANIZER', 'ACTIVE')
             RETURNING id`,
            ["Event Organizer", organizerEmail, passwordHash]
        );
        organizerId = orgRes.rows[0].id;

        // 3. Create regular USER
        const userRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status)
             VALUES ($1, $2, $3, 'USER', 'ACTIVE')
             RETURNING id`,
            ["Regular Attendee", userEmail, passwordHash]
        );
        regularUserId = userRes.rows[0].id;

        // 4. Create target USER to be disabled/re-enabled
        const targetRes = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status)
             VALUES ($1, $2, $3, 'USER', 'ACTIVE')
             RETURNING id`,
            ["Target Managed User", targetUserEmail, passwordHash]
        );
        targetUserId = targetRes.rows[0].id;

        // Obtain JWT tokens for each role via login endpoint
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
                (organizer_id, title, description, event_date, event_time, venue, capacity, registration_open, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [organizerId, "Admin Active Fest", "Normal active event", "2026-11-25", "10:00:00", "Main Stage", 50, true, "ACTIVE"]
        );
        activeEventId = evt1.rows[0].id;

        const evt2 = await pool.query(
            `INSERT INTO events
                (organizer_id, title, description, event_date, event_time, venue, capacity, registration_open, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [organizerId, "Pending Approval Summit", "Needs admin review", "2026-11-26", "11:00:00", "Hall 2", 30, true, "PENDING_APPROVAL"]
        );
        pendingEventId = evt2.rows[0].id;

        const evt3 = await pool.query(
            `INSERT INTO events
                (organizer_id, title, description, event_date, event_time, venue, capacity, registration_open, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [organizerId, "Event To Be Disabled", "Will be disabled by admin", "2026-11-27", "12:00:00", "Hall 3", 20, true, "ACTIVE"]
        );
        eventToDisableId = evt3.rows[0].id;
    });

    // -------------------------------------------------------------------------
    // TC-ADMIN-01 Verification 1 & 2: Authorization & Access Control
    // -------------------------------------------------------------------------

    test("TC-ADMIN-01 (1 & 2): Unauthenticated user is rejected from admin endpoints", async () => {
        const res = await request(app).get("/api/admin/users");
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toContain("token is required");
    });

    test("TC-ADMIN-01 (3): Regular user is rejected from administrator-only APIs", async () => {
        const res = await request(app)
            .get("/api/admin/users")
            .set("Authorization", `Bearer ${userToken}`);

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe("Administrator access required");
    });

    test("TC-ADMIN-01 (4): Event organizer is rejected from administrator-only actions", async () => {
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

    test("TC-ADMIN-01 (1): Administrator can access authorized administrative endpoints", async () => {
        const res = await request(app)
            .get("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Users retrieved successfully");
        expect(Array.isArray(res.body.users)).toBe(true);
    });

    // -------------------------------------------------------------------------
    // Comprehensive Admin Authorization & Role-Based Access Control Tests
    // -------------------------------------------------------------------------
    test("TC-ADMIN-AUTH-01: Admin events review endpoint enforces strict role-based authorization", async () => {
        // 1. Unauthenticated request rejected with 401
        const unauthRes = await request(app).get("/api/admin/events");
        expect(unauthRes.statusCode).toBe(401);
        expect(unauthRes.body.message).toContain("token is required");

        // 2. Regular user rejected with 403
        const userRes = await request(app)
            .get("/api/admin/events")
            .set("Authorization", `Bearer ${userToken}`);
        expect(userRes.statusCode).toBe(403);
        expect(userRes.body.message).toBe("Administrator access required");

        // 3. Organizer rejected with 403
        const orgRes = await request(app)
            .get("/api/admin/events")
            .set("Authorization", `Bearer ${organizerToken}`);
        expect(orgRes.statusCode).toBe(403);
        expect(orgRes.body.message).toBe("Administrator access required");

        // 4. Authorized administrator succeeds with 200
        const adminRes = await request(app)
            .get("/api/admin/events")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(adminRes.statusCode).toBe(200);
        expect(Array.isArray(adminRes.body.events)).toBe(true);
    });

    test("TC-ADMIN-AUTH-02: Event approval and moderation action enforces role-based authorization", async () => {
        // 1. Unauthenticated request rejected with 401
        const unauthRes = await request(app).patch(`/api/admin/events/${pendingEventId}/approve`);
        expect(unauthRes.statusCode).toBe(401);

        // 2. Regular user rejected with 403
        const userRes = await request(app)
            .patch(`/api/admin/events/${pendingEventId}/approve`)
            .set("Authorization", `Bearer ${userToken}`);
        expect(userRes.statusCode).toBe(403);
        expect(userRes.body.message).toBe("Administrator access required");

        // 3. Organizer rejected with 403 (even for events they created)
        const orgRes = await request(app)
            .patch(`/api/admin/events/${pendingEventId}/approve`)
            .set("Authorization", `Bearer ${organizerToken}`);
        expect(orgRes.statusCode).toBe(403);
        expect(orgRes.body.message).toBe("Administrator access required");
    });

    test("TC-ADMIN-AUTH-03: User status management enforces role-based authorization", async () => {
        // 1. Unauthenticated request rejected with 401
        const unauthRes = await request(app).patch(`/api/admin/users/${targetUserId}/status`).send({ status: "DISABLED" });
        expect(unauthRes.statusCode).toBe(401);

        // 2. Regular user rejected with 403
        const userRes = await request(app)
            .patch(`/api/admin/users/${targetUserId}/status`)
            .set("Authorization", `Bearer ${userToken}`)
            .send({ status: "DISABLED" });
        expect(userRes.statusCode).toBe(403);
        expect(userRes.body.message).toBe("Administrator access required");

        // 3. Organizer rejected with 403
        const orgRes = await request(app)
            .patch(`/api/admin/users/${targetUserId}/status`)
            .set("Authorization", `Bearer ${organizerToken}`)
            .send({ status: "DISABLED" });
        expect(orgRes.statusCode).toBe(403);
        expect(orgRes.body.message).toBe("Administrator access required");
    });

    test("TC-ADMIN-AUTH-04: Rejects malformed and expired tokens on administrative endpoints", async () => {
        const malformedRes = await request(app)
            .get("/api/admin/users")
            .set("Authorization", "Bearer invalid.token.value");
        expect(malformedRes.statusCode).toBe(401);
        expect(malformedRes.body.message).toContain("Invalid or expired");
    });

    // -------------------------------------------------------------------------
    // TC-ADMIN-01 Verification 5: User Management & Password Hash Protection
    // -------------------------------------------------------------------------

    test("TC-ADMIN-01 (5): Administrator retrieves user records without password hashes", async () => {
        const res = await request(app)
            .get("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.users.length).toBeGreaterThan(0);

        // Verify password hashes are NEVER exposed
        for (const user of res.body.users) {
            expect(user.password_hash).toBeUndefined();
            expect(user.password).toBeUndefined();
            expect(user.id).toBeDefined();
            expect(user.name).toBeDefined();
            expect(user.email).toBeDefined();
            expect(user.role).toBeDefined();
            expect(user.status).toBeDefined();
        }

        // Single user details check
        const singleRes = await request(app)
            .get(`/api/admin/users/${targetUserId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(singleRes.statusCode).toBe(200);
        expect(singleRes.body.user.password_hash).toBeUndefined();
        expect(singleRes.body.user.id).toBe(targetUserId);
        expect(singleRes.body.user.total_registrations).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // Admin User Pagination Tests
    // -------------------------------------------------------------------------
    test("TC-ADMIN-PAG-01: Admin user listing supports pagination parameters and returns pagination metadata", async () => {
        // Default pagination
        const defaultRes = await request(app)
            .get("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(defaultRes.statusCode).toBe(200);
        expect(defaultRes.body.page).toBe(1);
        expect(defaultRes.body.limit).toBe(20);
        expect(defaultRes.body.total).toBeGreaterThanOrEqual(4);
        expect(defaultRes.body.totalPages).toBeGreaterThanOrEqual(1);

        // Custom page and limit
        const paginatedRes = await request(app)
            .get("/api/admin/users?page=1&limit=2")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(paginatedRes.statusCode).toBe(200);
        expect(paginatedRes.body.page).toBe(1);
        expect(paginatedRes.body.limit).toBe(2);
        expect(paginatedRes.body.users.length).toBeLessThanOrEqual(2);

        // Page 2
        const page2Res = await request(app)
            .get("/api/admin/users?page=2&limit=2")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(page2Res.statusCode).toBe(200);
        expect(page2Res.body.page).toBe(2);
        expect(page2Res.body.limit).toBe(2);

        // Reject invalid page / limit
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

    // -------------------------------------------------------------------------
    // TC-ADMIN-01 Verification 6: Disabling and Re-enabling Users
    // -------------------------------------------------------------------------

    test("TC-ADMIN-01 (6): Administrator can disable a user and user is blocked from logging in", async () => {
        // Disable target user
        const disableRes = await request(app)
            .patch(`/api/admin/users/${targetUserId}/disable`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(disableRes.statusCode).toBe(200);
        expect(disableRes.body.user.status).toBe("DISABLED");

        // Verify in DB
        const dbUser = await pool.query("SELECT status FROM users WHERE id = $1", [targetUserId]);
        expect(dbUser.rows[0].status).toBe("DISABLED");

        // Disabled user attempting login must be blocked (403)
        const loginAttempt = await request(app)
            .post("/api/auth/login")
            .send({ email: targetUserEmail, password: defaultPassword });

        expect(loginAttempt.statusCode).toBe(403);
        expect(loginAttempt.body.message).toContain("Account is disabled");

        // Disabled user attempting registration is blocked (403)
        const regAttempt = await request(app)
            .post("/api/registrations")
            .send({
                event_id: activeEventId,
                user_id: targetUserId
            });

        expect(regAttempt.statusCode).toBe(403);
        expect(regAttempt.body.message).toContain("Disabled user account");
    });

    test("TC-ADMIN-01 (6): Administrator can re-enable a previously disabled user", async () => {
        // Re-enable target user
        const enableRes = await request(app)
            .patch(`/api/admin/users/${targetUserId}/enable`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(enableRes.statusCode).toBe(200);
        expect(enableRes.body.user.status).toBe("ACTIVE");

        // Verify in DB
        const dbUser = await pool.query("SELECT status FROM users WHERE id = $1", [targetUserId]);
        expect(dbUser.rows[0].status).toBe("ACTIVE");

        // Re-enabled user can now log in successfully
        const loginAttempt = await request(app)
            .post("/api/auth/login")
            .send({ email: targetUserEmail, password: defaultPassword });

        expect(loginAttempt.statusCode).toBe(200);
        expect(loginAttempt.body.token).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TC-ADMIN-01 Verification 7 & 8: Event Approval and Disabling
    // -------------------------------------------------------------------------

    test("TC-ADMIN-01 (7): Administrator can approve a pending event", async () => {
        const approveRes = await request(app)
            .patch(`/api/admin/events/${pendingEventId}/approve`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(approveRes.statusCode).toBe(200);
        expect(approveRes.body.event.status).toBe("ACTIVE");

        // Verify persisted in DB
        const dbEvt = await pool.query("SELECT status FROM events WHERE id = $1", [pendingEventId]);
        expect(dbEvt.rows[0].status).toBe("ACTIVE");
    });

    test("TC-ADMIN-01 (8): Administrator can disable an event", async () => {
        const disableRes = await request(app)
            .patch(`/api/admin/events/${eventToDisableId}/disable`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(disableRes.statusCode).toBe(200);
        expect(disableRes.body.event.status).toBe("DISABLED");

        // Verify persisted in DB
        const dbEvt = await pool.query("SELECT status FROM events WHERE id = $1", [eventToDisableId]);
        expect(dbEvt.rows[0].status).toBe("DISABLED");

        // Verify disabled event is excluded from standard public active event discovery
        const publicEvents = await request(app).get("/api/events");
        expect(publicEvents.statusCode).toBe(200);
        const disabledInListing = publicEvents.body.events.find(e => e.id === eventToDisableId);
        expect(disabledInListing).toBeUndefined();
    });

    test("TC-ADMIN-01 (9): Disabled events cannot be registered for", async () => {
        const regRes = await request(app)
            .post("/api/registrations")
            .send({
                event_id: eventToDisableId,
                user_id: regularUserId
            });

        expect(regRes.statusCode).toBe(400);
        expect(regRes.body.message).toContain("disabled event");
    });

    test("TC-ADMIN-01 (8): Administrator can re-enable a disabled event", async () => {
        const enableRes = await request(app)
            .patch(`/api/admin/events/${eventToDisableId}/enable`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(enableRes.statusCode).toBe(200);
        expect(enableRes.body.event.status).toBe("ACTIVE");

        // Now registration succeeds
        const regRes = await request(app)
            .post("/api/registrations")
            .send({
                event_id: eventToDisableId,
                user_id: regularUserId
            });

        expect(regRes.statusCode).toBe(201);
        expect(regRes.body.message).toBe("Registration successful");
    });

    // -------------------------------------------------------------------------
    // TC-ADMIN-01 Verification 10 & 11: Audit Logging & Activity Review
    // -------------------------------------------------------------------------

    test("TC-ADMIN-01 (10): Administrative actions generate audit log records", async () => {
        const auditRes = await request(app)
            .get("/api/admin/audit-logs")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(auditRes.statusCode).toBe(200);
        expect(Array.isArray(auditRes.body.logs)).toBe(true);
        expect(auditRes.body.logs.length).toBeGreaterThanOrEqual(4);

        // Verify audit log properties
        const actionsLogged = auditRes.body.logs.map(l => l.action);
        expect(actionsLogged).toContain("USER_DISABLE");
        expect(actionsLogged).toContain("USER_ENABLE");
        expect(actionsLogged).toContain("EVENT_APPROVE");
        expect(actionsLogged).toContain("EVENT_DISABLE");

        for (const log of auditRes.body.logs) {
            expect(log.admin_id).toBe(adminId);
            expect(log.created_at).toBeDefined();
            expect(log.status).toBe("SUCCESS");
            // Security check: passwords/tokens are not present in details
            if (log.details) {
                expect(log.details).not.toContain("password_hash");
                expect(log.details).not.toContain("AdminSecurePassword123!");
            }
        }
    });

    test("TC-ADMIN-01 (11): Audit logs are accessible ONLY to authorized administrators", async () => {
        // Unauthenticated access
        const noAuth = await request(app).get("/api/admin/audit-logs");
        expect(noAuth.statusCode).toBe(401);

        // Regular user access
        const userAccess = await request(app)
            .get("/api/admin/audit-logs")
            .set("Authorization", `Bearer ${userToken}`);
        expect(userAccess.statusCode).toBe(403);

        // Organizer access
        const orgAccess = await request(app)
            .get("/api/admin/audit-logs")
            .set("Authorization", `Bearer ${organizerToken}`);
        expect(orgAccess.statusCode).toBe(403);
    });

    test("TC-ADMIN-AUD-01: Audit log retrieval supports status, action, adminId, and date range filters", async () => {
        // Filter by action
        const actionRes = await request(app)
            .get("/api/admin/audit-logs?action=USER_DISABLE")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(actionRes.statusCode).toBe(200);
        expect(actionRes.body.logs.length).toBeGreaterThan(0);
        for (const log of actionRes.body.logs) {
            expect(log.action).toBe("USER_DISABLE");
        }

        // Filter by status
        const statusRes = await request(app)
            .get("/api/admin/audit-logs?status=SUCCESS")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(statusRes.statusCode).toBe(200);
        for (const log of statusRes.body.logs) {
            expect(log.status).toBe("SUCCESS");
        }

        // Filter by adminId
        const adminRes = await request(app)
            .get(`/api/admin/audit-logs?adminId=${adminId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(adminRes.statusCode).toBe(200);
        for (const log of adminRes.body.logs) {
            expect(log.admin_id).toBe(adminId);
        }

        // Filter by valid date range
        const today = new Date().toISOString().split("T")[0];
        const dateRes = await request(app)
            .get(`/api/admin/audit-logs?startDate=${today}&endDate=${today}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(dateRes.statusCode).toBe(200);
        expect(Array.isArray(dateRes.body.logs)).toBe(true);

        // Reject invalid date format
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

    test("TC-ADMIN-01 (12): Existing event and registration functionality continues to work", async () => {
        // Organizer views events via admin review
        const adminEvents = await request(app)
            .get("/api/admin/events")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(adminEvents.statusCode).toBe(200);
        expect(adminEvents.body.events.length).toBeGreaterThanOrEqual(3);

        // Standard user can view active event details
        const evtDetail = await request(app)
            .get(`/api/events/${activeEventId}`);

        expect(evtDetail.statusCode).toBe(200);
        expect(evtDetail.body.event.title).toBe("Admin Active Fest");
    });
    afterAll(async () => {
        await pool.query("DELETE FROM audit_logs WHERE admin_id = $1", [adminId]);
        await pool.query("DELETE FROM registrations WHERE event_id IN ($1, $2, $3)", [
            activeEventId,
            pendingEventId,
            eventToDisableId
        ]);
        await pool.query("DELETE FROM events WHERE id IN ($1, $2, $3)", [
            activeEventId,
            pendingEventId,
            eventToDisableId
        ]);
        await pool.query("DELETE FROM users WHERE id IN ($1, $2, $3, $4)", [
            adminId,
            organizerId,
            regularUserId,
            targetUserId
        ]);
        await pool.end();
    });


});
