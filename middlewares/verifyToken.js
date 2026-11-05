// middlewares/verifyToken.js
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_ALGORITHM } = require("../config/auth");
const User = require("../models/User");

// Checks the bearer token, then reloads the user so a deleted account or a
// changed role takes effect at once instead of when the token expires.
// req.user is { id, email, role } taken from the database, not from the token.
const verifyToken = async (req, res, next) => {
  const [scheme, token] = (req.headers["authorization"] || "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ status: "error", message: "No token provided" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
  } catch (err) {
    return res.status(401).json({ status: "error", message: "Invalid or expired token" });
  }

  const rows = await User.query("SELECT id, email, role FROM users WHERE id = ?", [decoded.id]);
  if (rows.length === 0) {
    return res.status(401).json({ status: "error", message: "Account no longer exists" });
  }

  req.user = { id: rows[0].id, email: rows[0].email, role: rows[0].role };
  next();
};

module.exports = verifyToken;
