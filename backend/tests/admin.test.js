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
        // Ensure audit_logs and columns exist
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
            UPDATE users SET status = 'ACTIVE' WHERE status IS NULL;
            ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE';
            UPDATE events SET status = 'ACTIVE' WHERE status IS NULL;
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER NOT NULL,
                action VARCHAR(100) NOT NULL,
                target_type VARCHAR(50),
                target_id INTEGER,
                details TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

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
});
