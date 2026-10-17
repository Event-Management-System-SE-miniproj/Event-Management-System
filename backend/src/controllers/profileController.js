const pool = require("../config/database");

// F-003: View User Profile
const getProfile = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, role, created_at, updated_at
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User profile not found"
            });
        }

        return res.status(200).json({
            message: "Profile retrieved successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Get profile error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve profile"
        });
    }
};


// F-003: Update User Profile
const updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Name and email are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check whether another user already uses this email
        const existingUser = await pool.query(
            `SELECT id
             FROM users
             WHERE email = $1
               AND id <> $2`,
            [normalizedEmail, req.user.id]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email is already registered"
            });
        }

        const result = await pool.query(
            `UPDATE users
             SET name = $1,
                 email = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING id, name, email, role, created_at, updated_at`,
            [
                name.trim(),
                normalizedEmail,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User profile not found"
            });
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Update profile error:", error.message);

        return res.status(500).json({
            message: "Failed to update profile"
        });
    }
};


module.exports = {
    getProfile,
    updateProfile
};