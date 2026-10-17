const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/database");

describe("User Registration and Authentication API", () => {

    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = "Test@12345";

    afterAll(async () => {
        await pool.query(
            "DELETE FROM users WHERE email = $1",
            [testEmail]
        );

        await pool.end();
    });

    // =========================
    // F-001: User Registration
    // =========================

    test("TC-REG-01: Create User Account", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: testEmail,
                password: testPassword
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe(
            "Account created successfully"
        );

        expect(response.body.user).toHaveProperty("id");
        expect(response.body.user.email).toBe(testEmail);

        expect(response.body.user).not.toHaveProperty("password");
        expect(response.body.user).not.toHaveProperty("password_hash");
    });

    test("Duplicate email should be rejected", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Duplicate User",
                email: testEmail,
                password: testPassword
            });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe(
            "Email is already registered"
        );
    });

    test("Missing required fields should be rejected", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Incomplete User",
                email: `missing_${Date.now()}@example.com`
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe(
            "Name, email and password are required"
        );
    });

    test("Password shorter than 8 characters should be rejected", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Short Password",
                email: `short_${Date.now()}@example.com`,
                password: "1234567"
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe(
            "Password must contain at least 8 characters"
        );
    });

    // =========================
    // F-002: Authentication
    // =========================

    test("TC-AUTH-01: Login with valid credentials", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: testEmail,
                password: testPassword
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Login successful");

        expect(response.body).toHaveProperty("token");
        expect(response.body.token).toBeTruthy();

        expect(response.body.user).toHaveProperty("id");
        expect(response.body.user.email).toBe(testEmail);

        expect(response.body.user).not.toHaveProperty("password");
        expect(response.body.user).not.toHaveProperty("password_hash");
    });

    test("Invalid password should be rejected", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: testEmail,
                password: "WrongPassword123"
            });

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe(
            "Invalid email or password"
        );
    });

    test("Nonexistent email should be rejected", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: `doesnotexist_${Date.now()}@example.com`,
                password: testPassword
            });

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe(
            "Invalid email or password"
        );
    });
});