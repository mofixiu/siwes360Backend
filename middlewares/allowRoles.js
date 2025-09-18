// middlewares/allowRoles.js
const allowRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ status: "error", message: "Forbidden - Access denied" });
        }

        next();
    };
};

module.exports = allowRoles;
