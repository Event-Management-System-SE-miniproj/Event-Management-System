const pool = require("./database");

const initDb = async () => {
    try {
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
    } catch (error) {
        console.error("Database initialization error:", error.message);
    }
};

module.exports = initDb;
