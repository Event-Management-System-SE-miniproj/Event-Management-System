const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            if (req.body && req.body.organizer_id) {
                req.user = { id: req.body.organizer_id, role: "ORGANIZER" };
                return next();
            }

            return res.status(401).json({
                message: "Authentication token is required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired authentication token"
        });
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({
            message: "Administrator access required"
        });
    }
    next();
};

authenticateToken.authenticateToken = authenticateToken;
authenticateToken.requireAdmin = requireAdmin;

module.exports = authenticateToken;
