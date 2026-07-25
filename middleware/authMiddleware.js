const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
    try {
        const authorization =
            req.headers.authorization || "";

        if (
            !authorization.startsWith(
                "Bearer "
            )
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication token is required."
            });
        }

        const token =
            authorization.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.auth = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message:
                error.name === "TokenExpiredError"
                    ? "Your session has expired."
                    : "Invalid authentication token."
        });
    }
};

const adminOnly = (req, res, next) => {
    if (req.auth?.role !== "admin") {
        return res.status(403).json({
            success: false,
            message:
                "Admin access is required."
        });
    }

    next();
};

module.exports = {
    protect,
    adminOnly
};