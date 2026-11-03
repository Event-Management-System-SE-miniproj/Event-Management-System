const request = require("supertest");
const app = require("../app");
const pool = require("../config/database");
const {
    getNotificationProvider,
    resetNotificationProvider
} = require("../services/notificationService");

describe("EMS-F-014: Event Notifications & Registration Confirmation", () => {
    let organizerId;
    let userId1;
    let userId2;
    let userIdUnregistered;
    let user1Token;
    let user2Token;
    let unregisteredToken;
    let eventId;
    let eventId2;
    let registrationId1;

    const orgEmail = `org_notif_${Date.now()}@example.com`;
    const user1Email = `user1_notif_${Date.now()}@example.com`;
    const user2Email = `user2_notif_${Date.now()}@example.com`;
    const userUnregEmail = `unreg_notif_${Date.now()}@example.com`;
    const testPassword = "Password@123";

    beforeAll(async () => {
        const initDb = require("../config/initDb");
        await initDb();

        // Register organizer
        const orgRes = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Organizer Notif",
                email: orgEmail,
                password: testPassword,
                role: "ORGANIZER"
            });
        organizerId = orgRes.body.user.id;

        // Register user 1
        const u1Res = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Attendee One",
                email: user1Email,
                password: testPassword,
                role: "USER"
            });
        userId1 = u1Res.body.user.id;

        // Register user 2
        const u2Res = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Attendee Two",
                email: user2Email,
                password: testPassword,
                role: "USER"
            });
        userId2 = u2Res.body.user.id;

        // Register unregistered user
        const unregRes = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Unregistered User",
                email: userUnregEmail,
                password: testPassword,
                role: "USER"
            });
        userIdUnregistered = unregRes.body.user.id;

        // Login users
        const u1Login = await request(app)
            .post("/api/auth/login")
            .send({ email: user1Email, password: testPassword });
        user1Token = u1Login.body.token;

        const u2Login = await request(app)
            .post("/api/auth/login")
            .send({ email: user2Email, password: testPassword });
        user2Token = u2Login.body.token;

        const unregLogin = await request(app)
            .post("/api/auth/login")
            .send({ email: userUnregEmail, password: testPassword });
        unregisteredToken = unregLogin.body.token;

        // Create primary test event
        const evtRes = await pool.query(
            `INSERT INTO events
                (organizer_id, title, description, event_date, event_time, venue, capacity, registration_open)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
                organizerId,
                "Tech Conference 2026",
                "A conference about modern software",
                "2026-11-20",
                "10:00:00",
                "Grand Hall A",
                10,
                true
            ]
        );
        eventId = evtRes.rows[0].id;

        // Create secondary test event for capacity testing
        const evt2Res = await pool.query(
            `INSERT INTO events
                (organizer_id, title, description, event_date, event_time, venue, capacity, registration_open)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
                organizerId,
                "Exclusive Workshop",
                "Limited seats",
                "2026-12-01",
                "14:00:00",
                "Room 101",
                1,
                true
            ]
        );
        eventId2 = evt2Res.rows[0].id;
    },30000);

    beforeEach(() => {
        const provider = resetNotificationProvider();
        provider.clear();
    });

    test("TC-NOTIF-01: A successful registration generates a confirmation notification", async () => {
        const res = await request(app)
            .post("/api/registrations")
            .send({
                event_id: eventId,
                user_id: userId1
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe("Registration successful");
        registrationId1 = res.body.registration.id;

        // Verify notification in DB
        const dbNotif = await pool.query(
            `SELECT * FROM notifications WHERE registration_id = $1 AND type = 'REGISTRATION_CONFIRMATION'`,
            [registrationId1]
        );

        expect(dbNotif.rows.length).toBe(1);
        const notif = dbNotif.rows[0];
        expect(notif.user_id).toBe(userId1);
        expect(notif.recipient_email).toBe(user1Email);
        expect(notif.title).toContain("Tech Conference 2026");
        expect(notif.message).toContain("Grand Hall A");
        expect(notif.status).toBe("SENT");
        expect(notif.is_read).toBe(false);

        // Verify provider recorded delivery
        const provider = getNotificationProvider();
        expect(provider.sentMessages.length).toBe(1);
        expect(provider.sentMessages[0].to).toBe(user1Email);
        expect(provider.sentMessages[0].subject).toContain("Tech Conference 2026");
    });

    test("TC-NOTIF-01: An unsuccessful registration does not generate a confirmation notification", async () => {
        const initialCountRes = await pool.query("SELECT COUNT(*) FROM notifications");
        const initialCount = parseInt(initialCountRes.rows[0].count, 10);

        // Attempt registration for non-existent event
        const res = await request(app)
            .post("/api/registrations")
            .send({
                event_id: 999999,
                user_id: userId2
            });

        expect(res.statusCode).toBe(404);

        // Verify no notification added
        const afterCountRes = await pool.query("SELECT COUNT(*) FROM notifications");
        const afterCount = parseInt(afterCountRes.rows[0].count, 10);
        expect(afterCount).toBe(initialCount);
    });

    test("TC-NOTIF-01: Duplicate registration request does not produce duplicate notifications", async () => {
        // Attempt duplicate registration for user1 on eventId
        const res = await request(app)
            .post("/api/registrations")
            .send({
                event_id: eventId,
                user_id: userId1
            });

        expect(res.statusCode).toBe(409);
        expect(res.body.message).toBe("User is already registered for this event");

        // Verify only 1 confirmation notification exists for this registration
        const countRes = await pool.query(
            `SELECT COUNT(*) FROM notifications WHERE registration_id = $1 AND type = 'REGISTRATION_CONFIRMATION'`,
            [registrationId1]
        );
        expect(parseInt(countRes.rows[0].count, 10)).toBe(1);
    });

    test("TC-NOTIF-01: Event notifications are restricted to registered participants only", async () => {
        // Register user2 as well
        const reg2Res = await request(app)
            .post("/api/registrations")
            .send({
                event_id: eventId,
                user_id: userId2
            });
        expect(reg2Res.statusCode).toBe(201);

        const provider = getNotificationProvider();
        provider.clear();

        // Update event details (triggering configured action EVENT_UPDATE)
        const updateRes = await request(app)
            .put(`/api/events/${eventId}`)
            .send({
                organizer_id: organizerId,
                title: "Tech Conference 2026 Updated",
                description: "Updated schedule and rooms",
                event_date: "2026-11-21",
                event_time: "11:00:00",
                venue: "Auditorium Prime",
                capacity: 15,
                registration_open: true
            });

        expect(updateRes.statusCode).toBe(200);

        // Registered user1 and user2 should receive the update notification
        const user1Notifs = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 AND type = 'EVENT_UPDATE' AND event_id = $2`,
            [userId1, eventId]
        );
        expect(user1Notifs.rows.length).toBe(1);
        expect(user1Notifs.rows[0].message).toContain("Auditorium Prime");

        const user2Notifs = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 AND type = 'EVENT_UPDATE' AND event_id = $2`,
            [userId2, eventId]
        );
        expect(user2Notifs.rows.length).toBe(1);

        // Unregistered user MUST NOT receive any notification
        const unregNotifs = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 AND event_id = $2`,
            [userIdUnregistered, eventId]
        );
        expect(unregNotifs.rows.length).toBe(0);
    });

    test("TC-NOTIF-01: Notification provider failure is handled safely without corrupting registrations", async () => {
        // Simulate provider failure
        const provider = getNotificationProvider();
        provider.setSimulateFailure(true);

        // Register for eventId2
        const res = await request(app)
            .post("/api/registrations")
            .send({
                event_id: eventId2,
                user_id: userId1
            });

        // Registration still completes successfully (201)
        expect(res.statusCode).toBe(201);
        expect(res.body.registration.status).toBe("PENDING_PAYMENT");

        const regId = res.body.registration.id;

        // Verify registration in DB is valid and uncorrupted
        const regDb = await pool.query("SELECT * FROM registrations WHERE id = $1", [regId]);
        expect(regDb.rows.length).toBe(1);

        // Verify notification was recorded as FAILED rather than crashing or disappearing
        const notifDb = await pool.query(
            `SELECT * FROM notifications WHERE registration_id = $1`,
            [regId]
        );
        expect(notifDb.rows.length).toBe(1);
        expect(notifDb.rows[0].status).toBe("FAILED");
    });

    test("TC-NOTIF-01: Authenticated user can view their notifications", async () => {
        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${user1Token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.notifications)).toBe(true);
        expect(res.body.notifications.length).toBeGreaterThanOrEqual(1);

        // Verify all returned notifications belong to user1
        for (const notif of res.body.notifications) {
            expect(notif.user_id).toBe(userId1);
        }
    });

    test("TC-NOTIF-01: Authenticated user can view single notification and mark it as read", async () => {
        // Get user1's first notification
        const listRes = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${user1Token}`);

        const notifId = listRes.body.notifications[0].id;

        // View single notification
        const singleRes = await request(app)
            .get(`/api/notifications/${notifId}`)
            .set("Authorization", `Bearer ${user1Token}`);

        expect(singleRes.statusCode).toBe(200);
        expect(singleRes.body.notification.id).toBe(notifId);

        // Mark as read
        const markRes = await request(app)
            .patch(`/api/notifications/${notifId}/read`)
            .set("Authorization", `Bearer ${user1Token}`);

        expect(markRes.statusCode).toBe(200);
        expect(markRes.body.notification.is_read).toBe(true);
        expect(markRes.body.notification.read_at).toBeTruthy();
    });

    test("TC-NOTIF-01: Unauthorized access to notification endpoints is blocked", async () => {
        // No token
        const noAuthRes = await request(app)
            .get("/api/notifications");
        expect(noAuthRes.statusCode).toBe(401);

        // User2 trying to view User1's notification
        const listRes = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${user1Token}`);
        const user1NotifId = listRes.body.notifications[0].id;

        const crossAccessRes = await request(app)
            .get(`/api/notifications/${user1NotifId}`)
            .set("Authorization", `Bearer ${user2Token}`);
        expect(crossAccessRes.statusCode).toBe(404);

        // User2 trying to mark User1's notification as read
        const crossMarkRes = await request(app)
            .patch(`/api/notifications/${user1NotifId}/read`)
            .set("Authorization", `Bearer ${user2Token}`);
        expect(crossMarkRes.statusCode).toBe(404);
    });

    test("TC-NOTIF-01: Event cancellation notifies registered participants", async () => {
        // Create an event to delete
        const tempEvtRes = await pool.query(
            `INSERT INTO events
                (organizer_id, title, description, event_date, event_time, venue, capacity, registration_open)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
                organizerId,
                "Cancelled Workshop",
                "Will be cancelled",
                "2026-12-15",
                "15:00:00",
                "Lab 3",
                5,
                true
            ]
        );
        const tempEvtId = tempEvtRes.rows[0].id;

        // Register user1 to this event
        await request(app)
            .post("/api/registrations")
            .send({
                event_id: tempEvtId,
                user_id: userId1
            });

        // Organizer deletes (cancels) the event
        const delRes = await request(app)
            .delete(`/api/events/${tempEvtId}`)
            .send({ organizer_id: organizerId });

        expect(delRes.statusCode).toBe(200);

        // Verify user1 received EVENT_CANCELLED notification
        const cancelNotifs = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 AND type = 'EVENT_CANCELLED' AND event_id = $2`,
            [userId1, tempEvtId]
        );
        expect(cancelNotifs.rows.length).toBe(1);
        expect(cancelNotifs.rows[0].title).toContain("Cancelled");

        // Verify unregistered user did not receive it
        const unregCancel = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 AND event_id = $2`,
            [userIdUnregistered, tempEvtId]
        );
        expect(unregCancel.rows.length).toBe(0);
    });

    // -------------------------------------------------------------------------
    // Input Validation: Notification Parameters & Query Filters
    // -------------------------------------------------------------------------
    test("TC-NOTIF-VAL-01: Rejects invalid notification ID formats", async () => {
        // Non-numeric ID
        const resNonNumeric = await request(app)
            .get("/api/notifications/invalid-id")
            .set("Authorization", `Bearer ${user1Token}`);
        expect(resNonNumeric.statusCode).toBe(400);
        expect(resNonNumeric.body.message).toBe("Invalid notification ID");

        // Negative ID
        const resNegative = await request(app)
            .get("/api/notifications/-5")
            .set("Authorization", `Bearer ${user1Token}`);
        expect(resNegative.statusCode).toBe(400);
        expect(resNegative.body.message).toBe("Invalid notification ID");

        // Decimal ID on mark read
        const resDecimal = await request(app)
            .patch("/api/notifications/2.5/read")
            .set("Authorization", `Bearer ${user1Token}`);
        expect(resDecimal.statusCode).toBe(400);
        expect(resDecimal.body.message).toBe("Invalid notification ID");
    });

    test("TC-NOTIF-VAL-02: Rejects invalid query filter parameters", async () => {
        // Invalid status filter
        const resInvalidStatus = await request(app)
            .get("/api/notifications?status=NON_EXISTENT")
            .set("Authorization", `Bearer ${user1Token}`);
        expect(resInvalidStatus.statusCode).toBe(400);
        expect(resInvalidStatus.body.message).toContain("Invalid status filter");

        // Invalid is_read filter
        const resInvalidRead = await request(app)
            .get("/api/notifications?is_read=maybe")
            .set("Authorization", `Bearer ${user1Token}`);
        expect(resInvalidRead.statusCode).toBe(400);
        expect(resInvalidRead.body.message).toContain("Invalid is_read filter");

        // Invalid pagination parameters
        const resInvalidLimit = await request(app)
            .get("/api/notifications?limit=-10")
            .set("Authorization", `Bearer ${user1Token}`);
        expect(resInvalidLimit.statusCode).toBe(400);
        expect(resInvalidLimit.body.message).toContain("Invalid pagination parameters");

        const resInvalidOffset = await request(app)
            .get("/api/notifications?offset=abc")
            .set("Authorization", `Bearer ${user1Token}`);
        expect(resInvalidOffset.statusCode).toBe(400);
        expect(resInvalidOffset.body.message).toContain("Invalid pagination parameters");
    });

    test("TC-NOTIF-VAL-03: Successfully filters notifications by valid parameters", async () => {
        const resFiltered = await request(app)
            .get("/api/notifications?status=SENT&is_read=false&limit=10")
            .set("Authorization", `Bearer ${user1Token}`);
        expect(resFiltered.statusCode).toBe(200);
        expect(resFiltered.body.message).toBe("Notifications retrieved successfully");
        expect(Array.isArray(resFiltered.body.notifications)).toBe(true);
        for (const notif of resFiltered.body.notifications) {
            expect(notif.status).toBe("SENT");
            expect(notif.is_read).toBe(false);
        }
    });

    test("TC-NOTIF-ERR-01: Provider failure with sensitive credentials sanitizes errors and protects registration state", async () => {
        // Create mock provider that fails with sensitive credentials in error message
        class SensitiveErrorProvider {
            async send() {
                throw new Error("SMTP authentication failure at smtp://mailer:super_secret_smtp_password@smtp.mail.com:587?pass=my_secret_token");
            }
        }

        const { setNotificationProvider } = require("../services/notificationService");
        setNotificationProvider(new SensitiveErrorProvider());

        // Spy on console.error to verify sanitization
        const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        // Attempt registration
        const tempEvtRes = await pool.query(
            `INSERT INTO events
                (organizer_id, title, description, event_date, event_time, venue, capacity, registration_open)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [organizerId, "Error Test Workshop", "Test error sanitization", "2026-12-10", "11:00:00", "Lab 9", 10, true]
        );
        const tempId = tempEvtRes.rows[0].id;

        const res = await request(app)
            .post("/api/registrations")
            .send({
                event_id: tempId,
                user_id: userId2
            });

        // Registration succeeds despite provider failure
        expect(res.statusCode).toBe(201);
        expect(res.body.registration).toBeDefined();

        // Notification record is marked FAILED in DB
        const failedNotifs = await pool.query(
            `SELECT * FROM notifications WHERE event_id = $1 AND user_id = $2`,
            [tempId, userId2]
        );
        expect(failedNotifs.rows.length).toBe(1);
        expect(failedNotifs.rows[0].status).toBe("FAILED");

        // Verify credentials were redacted from logged error calls
        const errorCalls = errorSpy.mock.calls.map(call => call.join(" "));
        for (const callText of errorCalls) {
            expect(callText).not.toContain("super_secret_smtp_password");
            expect(callText).not.toContain("my_secret_token");
        }

        errorSpy.mockRestore();

        // Teardown temp event
        await pool.query("DELETE FROM notifications WHERE event_id = $1", [tempId]);
        await pool.query("DELETE FROM registrations WHERE event_id = $1", [tempId]);
        await pool.query("DELETE FROM events WHERE id = $1", [tempId]);
    });

    afterAll(async () => {
        await pool.query("DELETE FROM notifications WHERE recipient_email IN ($1, $2, $3, $4)", [
            orgEmail,
            user1Email,
            user2Email,
            userUnregEmail
        ]);
        await pool.query("DELETE FROM registrations WHERE event_id IN ($1, $2)", [eventId, eventId2]);
        await pool.query("DELETE FROM events WHERE id IN ($1, $2)", [eventId, eventId2]);
        await pool.query("DELETE FROM users WHERE id IN ($1, $2, $3, $4)", [
            organizerId,
            userId1,
            userId2,
            userIdUnregistered
        ]);
        await pool.end();
    });
});

