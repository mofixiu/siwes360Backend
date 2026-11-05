const nodemailer = require("nodemailer");
require("dotenv").config();

// How password-reset emails are delivered, chosen by MAIL_TRANSPORT:
//   smtp    - real email through SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS (the
//             default whenever SMTP_HOST is set)
//   console - print the email to the server console; for local development only
//   memory  - keep emails in `outbox`; used by the tests
// With none of these, the reset endpoints answer 503 instead of pretending to
// send a code.
const mode = process.env.MAIL_TRANSPORT || (process.env.SMTP_HOST ? "smtp" : "none");
const isProduction = process.env.NODE_ENV === "production";

if ((mode === "console" || mode === "memory") && isProduction) {
  throw new Error(`MAIL_TRANSPORT=${mode} prints reset codes and must not be used in production.`);
}

const outbox = [];
let transport = null;

if (mode === "smtp" && process.env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
} else if (mode === "console" || mode === "memory") {
  transport = nodemailer.createTransport({ jsonTransport: true });
}

const isConfigured = () => transport !== null;

const sendMail = async ({ to, subject, text }) => {
  if (!transport) throw new Error("Email is not configured");
  const message = { from: process.env.MAIL_FROM || "SIWES360 <no-reply@siwes360.local>", to, subject, text };
  const info = await transport.sendMail(message);
  if (mode === "memory") outbox.push(message);
  if (mode === "console") console.log(`📧 [dev mail] to ${to}: ${subject}\n${text}`);
  return info;
};

module.exports = { isConfigured, sendMail, outbox, mode };
