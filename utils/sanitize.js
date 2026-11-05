// Columns of `users` that may leave the server. Anything else (password hash,
// reset secrets) stays in the database.
const PUBLIC_USER_COLUMNS = ["id", "email", "full_name", "phone", "role", "created_at", "updated_at"];
const PUBLIC_USER_SELECT = PUBLIC_USER_COLUMNS.join(", ");

const publicUser = (row) => {
  if (!row) return row;
  const out = {};
  for (const key of PUBLIC_USER_COLUMNS) {
    if (row[key] !== undefined) out[key] = row[key];
  }
  return out;
};

// Copy only the allowed keys that are present in `source`.
const pick = (source, allowed) => {
  const out = {};
  if (!source || typeof source !== "object") return out;
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      out[key] = source[key];
    }
  }
  return out;
};

const REDACTED_KEYS = /pass(word)?|otp|token|secret/i;

// For request logging: hide passwords, OTPs and tokens.
const redact = (body) => {
  if (!body || typeof body !== "object") return body;
  const out = {};
  for (const [key, value] of Object.entries(body)) {
    out[key] = REDACTED_KEYS.test(key) ? "[redacted]" : value;
  }
  return out;
};

module.exports = { PUBLIC_USER_COLUMNS, PUBLIC_USER_SELECT, publicUser, pick, redact };
