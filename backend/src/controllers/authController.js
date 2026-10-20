
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

// F-001: User Account Creation
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        // Validate password length
        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters"
            });
        }

        // Validate and normalize role
        const role = String(req.body.role || "USER")
            .trim()
            .toUpperCase();

        if (!["USER", "ORGANIZER"].includes(role)) {
            return res.status(400).json({
                message: "Invalid role selected"
            });
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase();

        // Check if email already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email is already registered"
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Insert user with selected role
        const result = await pool.query(
            `INSERT INTO users
                (name, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, role`,
            [
                name.trim(),
                normalizedEmail,
                passwordHash,
                role
            ]
        );

        return res.status(201).json({
            message: "Account created successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Registration error:", error);

        return res.status(500).json({
            message: "Failed to create account"
        });
    }
};


// F-002: User Authentication
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase();

        // Find user
        const result = await pool.query(
            `SELECT id, name, email, password_hash, role
             FROM users
             WHERE email = $1`,
            [normalizedEmail]
        );

        // User not found
        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        // Check password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Create JWT containing the actual database role
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: String(user.role).toUpperCase()
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: String(user.role).toUpperCase()
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Failed to authenticate user"
        });
    }
};


module.exports = {
    registerUser,
    loginUser
};
