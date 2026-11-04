const pool = require("./database");

let initPromise = null;

const initDb = () => {
    if (!initPromise) {
        initPromise = (async () => {
            let client;
            try {
                client = await pool.connect();

                // Transaction-level advisory lock prevents concurrent catalog race conditions in CI / parallel tests
                await client.query("SELECT pg_advisory_lock(987654321)");

                // Notifications table (F-014)
                await client.query(`
                    CREATE TABLE IF NOT EXISTS notifications (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        recipient_email VARCHAR(255) NOT NULL,
                        event_id INTEGER,
                        registration_id INTEGER,
                        type VARCHAR(50) NOT NULL,
                        title VARCHAR(255) NOT NULL,
                        message TEXT NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'SENT',
                        is_read BOOLEAN NOT NULL DEFAULT FALSE,
                        read_at TIMESTAMP,
                        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                `);

                // Users status column for account management (F-015)
                await client.query(`
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
                    UPDATE users SET status = 'ACTIVE' WHERE status IS NULL;
                `);

                // Allow all supported application roles (case-insensitive to support both 'user'/'organizer'/'admin' and 'USER'/'ORGANIZER'/'ADMIN')
                await client.query(`
                    ALTER TABLE users
                    DROP CONSTRAINT IF EXISTS users_role_check;

                    ALTER TABLE users
                    ADD CONSTRAINT users_role_check
                    CHECK (LOWER(role) IN ('user', 'organizer', 'admin'));
                `);

                // Events status column check (F-015)
                await client.query(`
                    ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE';
                    UPDATE events SET status = 'ACTIVE' WHERE status IS NULL;
                `);

                // Payments table (F-010)
                await client.query(`
                    CREATE TABLE IF NOT EXISTS payments (
                        id SERIAL PRIMARY KEY,
                        registration_id INTEGER NOT NULL,
                        amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                        payment_method VARCHAR(50) NOT NULL DEFAULT 'MOCK',
                        transaction_id VARCHAR(100),
                        status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                `);

                // Audit logs table (F-015)
                await client.query(`
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

            } catch (error) {
                // Safe handling of concurrent catalog insertion (PostgreSQL 23505 / 42P07)
                if (error.code !== "23505" && error.code !== "42P07" && !error.message?.includes("called end on the pool")) {
                    console.error("Database initialization error:", error.message);
                }
            } finally {
                if (client) {
                    try {
                        await client.query("SELECT pg_advisory_unlock(987654321)");
                    } catch (_) {
                        // Ignore errors while releasing the advisory lock during cleanup.
                    }
                    try {
                        client.release();
                    } catch (_) {
                        // Ignore errors while releasing the database client.
                    }
                }
            }
        })();
    }
    return initPromise;
};

module.exports = initDb;
