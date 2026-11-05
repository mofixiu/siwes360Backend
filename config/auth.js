const crypto = require("crypto");
require("dotenv").config();

// The old code fell back to a secret that is committed to the public repo, so
// anyone could sign a token with role "admin". Never fall back to a known value.
const WEAK_SECRETS = new Set(["what is your name"]);

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || WEAK_SECRETS.has(JWT_SECRET)) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set to a long random value in production.");
  }
  JWT_SECRET = crypto.randomBytes(48).toString("hex");
  console.warn(
    "⚠️  JWT_SECRET is not set. Using a random secret for this run, so tokens stop " +
      "working when the server restarts. Set JWT_SECRET in .env to keep sessions."
  );
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN: "7d",
  JWT_ALGORITHM: "HS256",
  PASSWORD_MIN_LENGTH: 8,
  BCRYPT_ROUNDS: 10,
};
