require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./src/config/database");

async function seed() {
    try {
        console.log("Seeding database...");

        // Ensure users exist
        const adminHash = await bcrypt.hash("Admin@12345", 12);
        const orgHash = await bcrypt.hash("Organizer@12345", 12);
        const userHash = await bcrypt.hash("User@12345", 12);

        // Check Admin
        const adminCheck = await pool.query("SELECT id FROM users WHERE email = $1", ["admin@ems.edu"]);
        let adminId;
        if (adminCheck.rows.length === 0) {
            const res = await pool.query(
                `INSERT INTO users (name, email, password_hash, role, status)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                ["System Administrator", "admin@ems.edu", adminHash, "ADMIN", "ACTIVE"]
            );
            adminId = res.rows[0].id;
            console.log("Created admin user: admin@ems.edu (ID:", adminId, ")");
        } else {
            adminId = adminCheck.rows[0].id;
            console.log("Admin user already exists (ID:", adminId, ")");
        }

        // Check Organizer
        const orgCheck = await pool.query("SELECT id FROM users WHERE email = $1", ["organizer@ems.edu"]);
        let orgId;
        if (orgCheck.rows.length === 0) {
            const res = await pool.query(
                `INSERT INTO users (name, email, password_hash, role, status)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                ["Dev Community Lead", "organizer@ems.edu", orgHash, "ORGANIZER", "ACTIVE"]
            );
            orgId = res.rows[0].id;
            console.log("Created organizer user: organizer@ems.edu (ID:", orgId, ")");
        } else {
            orgId = orgCheck.rows[0].id;
            console.log("Organizer user already exists (ID:", orgId, ")");
        }

        // Check Normal User
        const userCheck = await pool.query("SELECT id FROM users WHERE email = $1", ["attendee@ems.edu"]);
        let userId;
        if (userCheck.rows.length === 0) {
            const res = await pool.query(
                `INSERT INTO users (name, email, password_hash, role, status)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                ["Jane Doe", "attendee@ems.edu", userHash, "USER", "ACTIVE"]
            );
            userId = res.rows[0].id;
            console.log("Created attendee user: attendee@ems.edu (ID:", userId, ")");
        } else {
            userId = userCheck.rows[0].id;
            console.log("Attendee user already exists (ID:", userId, ")");
        }

        // Seed some upcoming events if fewer than 3 events
        const eventCountRes = await pool.query("SELECT COUNT(*)::INTEGER as count FROM events");
        if (eventCountRes.rows[0].count < 3) {
            console.log("Adding sample events...");
            await pool.query(
                `INSERT INTO events (organizer_id, title, description, event_date, event_time, venue, capacity, registration_open, status)
                 VALUES
                 ($1, 'National AI & Cloud Summit 2026', 'Premier academic symposium exploring transformer models, distributed agents, and scalable cloud systems.', '2026-11-20', '10:00:00', 'Auditorium Block A', 150, true, 'ACTIVE'),
                 ($1, 'CyberSecurity CTF Challenge', 'Hands-on collegiate capture-the-flag competition covering cryptography, reverse engineering, and web defense.', '2026-11-25', '14:00:00', 'CS Innovation Lab 3', 60, true, 'ACTIVE'),
                 ($1, 'Full-Stack Web3 Workshop', 'Practical workshop on smart contract deployment, frontend dApp integration, and modern API pipelines.', '2026-12-05', '11:00:00', 'Seminar Hall 2', 80, true, 'ACTIVE')`,
                [orgId]
            );
            console.log("Sample events inserted.");
        }

        console.log("Seeding completed successfully.");
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error("Seeding error:", err);
        await pool.end();
        process.exit(1);
    }
}

seed();

