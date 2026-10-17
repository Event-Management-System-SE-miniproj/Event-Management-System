const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const pool = require("../src/config/database");

describe("F-003: User Profile Management", () => {

    let token;
    let userId;

    beforeAll(async () => {
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [
                "Profile Test User",
                "profiletest@test.com",
                "test_hash",
                "USER"
            ]
        );

        userId = result.rows[0].id;

        token = jwt.sign(
            {
                id: userId,
                email: "profiletest@test.com",
                role: "USER"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );
    });

    afterAll(async () => {
        await pool.query(
            "DELETE FROM users WHERE id = $1",
            [userId]
        );

        await pool.end();
    });

    test("TC-PROF-01: Get user profile", async () => {
        const response = await request(app)
            .get("/api/users/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.user).toHaveProperty("id", userId);
        expect(response.body.user.email).toBe("profiletest@test.com");
        expect(response.body.user).not.toHaveProperty("password_hash");
    });

    test("Get profile without authentication", async () => {
        const response = await request(app)
            .get("/api/users/profile");

        expect(response.statusCode).toBe(401);
    });

    test("Update user profile", async () => {
        const response = await request(app)
            .put("/api/users/profile")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Updated Profile User",
                email: "profileupdated@test.com"
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.user.name).toBe("Updated Profile User");
        expect(response.body.user.email).toBe("profileupdated@test.com");
    });

    test("Reject duplicate email during profile update", async () => {
        const existingUser = await pool.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [
                "Another User",
                "existingprofile@test.com",
                "test_hash",
                "USER"
            ]
        );

        const response = await request(app)
            .put("/api/users/profile")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Updated Profile User",
                email: "existingprofile@test.com"
            });

        expect(response.statusCode).toBe(409);

        await pool.query(
            "DELETE FROM users WHERE id = $1",
            [existingUser.rows[0].id]
        );
    });
});
