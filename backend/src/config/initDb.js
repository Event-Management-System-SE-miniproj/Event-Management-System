const pool = require("./database");

const initDb = async () => {
    try {
        // Notifications table (F-014)
        await pool.query(`
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
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
            UPDATE users SET status = 'ACTIVE' WHERE status IS NULL;
        `);

        // Events status column check (F-015)
        await pool.query(`
            ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE';
            UPDATE events SET status = 'ACTIVE' WHERE status IS NULL;
        `);

        // Audit logs table (F-015)
        await pool.query(`
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
        console.error("Database initialization error:", error.message);
    }
};

module.exports = initDb;
