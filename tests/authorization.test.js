// End-to-end checks of who may do what, against a throwaway MySQL database.
//
//   npm test
//
// Uses the same DB_HOST/DB_USER/DB_PASSWORD/DB_PORT as the app, but always the
// database named by TEST_DB_NAME (default siwes360_test), which it drops and
// recreates. It never touches the real siwes360 database.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const TEST_DB = process.env.TEST_DB_NAME || "siwes360_test";
if (!/_test$/.test(TEST_DB)) throw new Error("TEST_DB_NAME must end in _test");

process.env.DB_NAME = TEST_DB;
process.env.JWT_SECRET = "test-secret-" + Date.now();
process.env.MAIL_TRANSPORT = "memory";
delete process.env.NODE_ENV;

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "david001",
  port: Number(process.env.DB_PORT || 3306),
};

const PASSWORD = "Password123";
let server, baseUrl, pool, admin;
const ids = {};
const tokens = {};
const responses = [];

const sqlStatements = (file) =>
  fs
    .readFileSync(path.join(__dirname, "..", "database", file), "utf8")
    .replace(/--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    // MySQL has no CREATE INDEX IF NOT EXISTS; the indexes don't matter here.
    .filter((s) => s && !/^CREATE INDEX IF NOT EXISTS/i.test(s));

async function api(method, url, { token, body } = {}) {
  const res = await fetch(baseUrl + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  responses.push({ method, url, text });
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, body: json };
}

const userRow = async (id) => (await admin.query("SELECT * FROM users WHERE id = ?", [id]))[0][0];

before(async () => {
  admin = await mysql.createConnection({ ...dbConfig, multipleStatements: false });
  await admin.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
  await admin.query(`CREATE DATABASE \`${TEST_DB}\``);
  await admin.query(`USE \`${TEST_DB}\``);
  for (const stmt of [...sqlStatements("siwes360_migration.sql"), ...sqlStatements("002_password_resets.sql")]) {
    await admin.query(stmt);
  }

  const hash = await bcrypt.hash(PASSWORD, 4);
  const addUser = async (key, role, extra = {}) => {
    const [r] = await admin.query("INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)", [
      `${key}@test.local`,
      hash,
      key,
      role,
    ]);
    ids[key] = r.insertId;
    return r.insertId;
  };

  const [schoolA] = await admin.query("INSERT INTO schools (name) VALUES ('School A')");
  const [schoolB] = await admin.query("INSERT INTO schools (name) VALUES ('School B')");
  ids.schoolA = schoolA.insertId;
  ids.schoolB = schoolB.insertId;

  for (const key of ["adminA", "adminB"]) {
    await addUser(key, "admin");
    await admin.query("INSERT INTO admins (user_id, school_id) VALUES (?, ?)", [
      ids[key],
      key === "adminA" ? ids.schoolA : ids.schoolB,
    ]);
  }
  for (const key of ["sup1", "sup2"]) {
    await addUser(key, "supervisor");
    await admin.query("INSERT INTO supervisors (user_id, organization, position) VALUES (?, 'Org', 'Lead')", [
      ids[key],
    ]);
  }
  for (const [key, sup] of [
    ["studentX", "sup1"],
    ["studentY", "sup2"],
  ]) {
    await addUser(key, "student");
    await admin.query(
      "INSERT INTO students (user_id, matric_no, school_id, supervisor_id) VALUES (?, ?, ?, ?)",
      [ids[key], key, ids.schoolA, ids[sup]]
    );
  }
  await addUser("itf1", "itf");
  await admin.query("INSERT INTO itf (user_id, region) VALUES (?, 'South West')", [ids.itf1]);

  const app = require("../app");
  pool = require("../models/Connection");
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  for (const key of ["adminA", "adminB", "sup1", "sup2", "studentX", "studentY", "itf1"]) {
    const res = await api("POST", "/auth/login", { body: { email: `${key}@test.local`, password: PASSWORD } });
    assert.equal(res.status, 200, `login ${key}`);
    tokens[key] = res.body.data.token;
  }
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (pool) await pool.end();
  if (admin) {
    await admin.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
    await admin.end();
  }
});

// ---- Tokens ---------------------------------------------------------------

test("a token signed with the old hard-coded secret is rejected", async () => {
  const forged = jwt.sign({ id: ids.studentX, role: "admin" }, "what is your name");
  const res = await api("GET", "/users", { token: forged });
  assert.equal(res.status, 401);
});

test("the role comes from the database, not from the token", async () => {
  const forged = jwt.sign({ id: ids.studentX, role: "admin" }, process.env.JWT_SECRET);
  const res = await api("GET", "/users", { token: forged });
  assert.equal(res.status, 403);
});

// ---- Users ----------------------------------------------------------------

test("a student cannot list users", async () => {
  const res = await api("GET", "/users", { token: tokens.studentX });
  assert.equal(res.status, 403);
});

test("the admin user list has no password hashes", async () => {
  const res = await api("GET", "/users", { token: tokens.adminA });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.length >= 7);
  for (const user of res.body.data) assert.equal(user.password, undefined);
});

test("a student cannot read another user, and reading themselves hides the hash", async () => {
  assert.equal((await api("GET", `/users/${ids.studentY}`, { token: tokens.studentX })).status, 403);
  assert.equal((await api("GET", `/users/${ids.adminA}`, { token: tokens.studentX })).status, 403);
  const self = await api("GET", `/users/${ids.studentX}`, { token: tokens.studentX });
  assert.equal(self.status, 200);
  assert.equal(self.body.data.password, undefined);
});

test("a student cannot edit another user", async () => {
  for (const method of ["PATCH", "PUT"]) {
    const res = await api(method, `/users/${ids.studentY}`, {
      token: tokens.studentX,
      body: { full_name: "Hacked", email: "hacked@test.local" },
    });
    assert.equal(res.status, 403);
  }
  assert.equal((await userRow(ids.studentY)).full_name, "studentY");
});

test("a student editing themselves cannot change role or password", async () => {
  const before = await userRow(ids.studentX);
  const res = await api("PATCH", `/users/${ids.studentX}`, {
    token: tokens.studentX,
    body: { full_name: "Student X", role: "admin", password: "x", id: ids.studentY },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.password, undefined);
  const afterRow = await userRow(ids.studentX);
  assert.equal(afterRow.full_name, "Student X");
  assert.equal(afterRow.role, "student");
  assert.equal(afterRow.password, before.password);

  const onlyForbidden = await api("PATCH", `/users/${ids.studentX}`, {
    token: tokens.studentX,
    body: { role: "admin" },
  });
  assert.equal(onlyForbidden.status, 400);
  assert.equal((await userRow(ids.studentX)).role, "student");
});

test("a supervisor can update their own name, email and phone (the app's profile screen)", async () => {
  const res = await api("PUT", `/users/${ids.sup1}`, {
    token: tokens.sup1,
    body: { full_name: "Supervisor One", email: "sup1@test.local", phone: "0800" },
  });
  assert.equal(res.status, 200);
  assert.equal((await userRow(ids.sup1)).phone, "0800");
});

test("a student cannot delete users", async () => {
  const res = await api("DELETE", `/users/${ids.studentY}`, { token: tokens.studentX });
  assert.equal(res.status, 403);
  assert.ok(await userRow(ids.studentY));
});

test("a student cannot create users", async () => {
  const res = await api("POST", "/users", {
    token: tokens.studentX,
    body: { email: "new@test.local", password: "Password123", full_name: "New", role: "admin" },
  });
  assert.equal(res.status, 403);
});

// ---- Students and supervisors --------------------------------------------

test("students only see their own student record", async () => {
  assert.equal((await api("GET", `/students/${ids.studentX}`, { token: tokens.studentX })).status, 200);
  assert.equal((await api("GET", `/students/${ids.studentY}`, { token: tokens.studentX })).status, 403);
  assert.equal((await api("GET", `/students/${ids.studentY}/dashboard`, { token: tokens.studentX })).status, 403);
  assert.equal((await api("GET", "/students", { token: tokens.studentX })).status, 403);
});

test("supervisors only see their own students", async () => {
  assert.equal((await api("GET", `/students/${ids.studentX}`, { token: tokens.sup1 })).status, 200);
  assert.equal((await api("GET", `/students/${ids.studentX}`, { token: tokens.sup2 })).status, 403);
  assert.equal((await api("GET", `/supervisors/${ids.sup1}/students`, { token: tokens.sup2 })).status, 403);
  assert.equal((await api("GET", `/supervisors/${ids.sup1}/dashboard`, { token: tokens.studentX })).status, 403);
  assert.equal((await api("GET", `/supervisors/${ids.sup1}/students`, { token: tokens.sup1 })).status, 200);
});

test("a student cannot rewrite their own student record or another student's internship", async () => {
  const res = await api("PATCH", `/students/${ids.studentX}`, {
    token: tokens.studentX,
    body: { school_id: ids.schoolB },
  });
  assert.equal(res.status, 403);
  const other = await api("PATCH", `/students/${ids.studentY}/internship-dates`, {
    token: tokens.studentX,
    body: { internship_start_date: "2026-01-01", internship_end_date: "2026-06-01" },
  });
  assert.equal(other.status, 403);
});

test("a supervisor cannot edit another supervisor", async () => {
  const res = await api("PATCH", `/supervisors/${ids.sup1}`, { token: tokens.sup2, body: { position: "Hacked" } });
  assert.equal(res.status, 403);
});

// ---- Grades ---------------------------------------------------------------

test("a student cannot grade themselves", async () => {
  const res = await api("POST", "/grades", {
    token: tokens.studentX,
    body: { student_id: ids.studentX, graded_by: ids.adminA, score: 100 },
  });
  assert.equal(res.status, 403);
  const [rows] = await admin.query("SELECT * FROM grades WHERE student_id = ?", [ids.studentX]);
  assert.equal(rows.length, 0);
});

test("supervisors and admins of another school cannot grade a student", async () => {
  const body = { student_id: ids.studentX, score: 90 };
  assert.equal((await api("POST", "/grades", { token: tokens.sup1, body })).status, 403);
  assert.equal((await api("POST", "/grades", { token: tokens.adminB, body })).status, 403);
});

test("the student's school admin can grade, and graded_by is the admin", async () => {
  const res = await api("POST", "/grades", {
    token: tokens.adminA,
    body: { student_id: ids.studentX, score: 75, remarks: "Good", graded_by: ids.adminB },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.graded_by, ids.adminA);
  ids.gradeX = res.body.data.id;

  assert.equal((await api("GET", `/grades/student/${ids.studentX}`, { token: tokens.studentX })).status, 200);
  assert.equal((await api("GET", `/grades/${ids.gradeX}`, { token: tokens.studentX })).status, 200);
  assert.equal((await api("GET", `/grades/student/${ids.studentX}`, { token: tokens.studentY })).status, 403);
  assert.equal((await api("GET", `/grades/${ids.gradeX}`, { token: tokens.studentY })).status, 403);
  assert.equal((await api("GET", "/grades", { token: tokens.studentX })).status, 403);
  assert.equal((await api("DELETE", `/grades/${ids.gradeX}`, { token: tokens.studentX })).status, 403);
});

// ---- Daily logs -----------------------------------------------------------

test("a log is always filed under the signed-in student", async () => {
  const res = await api("POST", "/logs", {
    token: tokens.studentX,
    body: { student_id: ids.studentY, log_date: "2026-11-02", description: "Worked on the API" },
  });
  assert.equal(res.status, 200);
  ids.logX = res.body.data.id;
  const [rows] = await admin.query("SELECT student_id FROM daily_logs WHERE id = ?", [ids.logX]);
  assert.equal(rows[0].student_id, ids.studentX);

  assert.equal(
    (await api("POST", "/logs", { token: tokens.sup1, body: { log_date: "2026-11-02", description: "x" } })).status,
    403
  );
});

test("other students and other supervisors cannot read a log", async () => {
  assert.equal((await api("GET", `/logs/${ids.logX}`, { token: tokens.studentY })).status, 403);
  assert.equal((await api("GET", `/logs/student/${ids.studentX}`, { token: tokens.studentY })).status, 403);
  assert.equal((await api("GET", `/logs/student/${ids.studentX}`, { token: tokens.sup2 })).status, 403);
  assert.equal((await api("GET", `/logs/${ids.logX}`, { token: tokens.sup1 })).status, 200);
  assert.equal((await api("GET", "/logs", { token: tokens.studentX })).status, 403);
});

test("a student cannot approve their own log or set its status", async () => {
  assert.equal((await api("PUT", `/logs/${ids.logX}/approve`, { token: tokens.studentX, body: {} })).status, 403);
  const patch = await api("PATCH", `/logs/${ids.logX}`, {
    token: tokens.studentX,
    body: { description: "Edited", status: "approved", supervisor_comment: "Great" },
  });
  assert.equal(patch.status, 200);
  const [rows] = await admin.query("SELECT status, supervisor_comment, description FROM daily_logs WHERE id = ?", [
    ids.logX,
  ]);
  assert.deepEqual(rows[0], { status: "pending", supervisor_comment: null, description: "Edited" });
});

test("another student cannot edit or delete the log", async () => {
  assert.equal(
    (await api("PATCH", `/logs/${ids.logX}`, { token: tokens.studentY, body: { description: "x" } })).status,
    403
  );
  assert.equal((await api("DELETE", `/logs/${ids.logX}`, { token: tokens.studentY })).status, 403);
});

test("only the student's own supervisor can review the log", async () => {
  const body = { supervisor_comment: "Nice" };
  assert.equal((await api("PUT", `/logs/${ids.logX}/approve`, { token: tokens.sup2, body })).status, 403);
  assert.equal((await api("PUT", `/logs/${ids.logX}/reject`, { token: tokens.sup2, body })).status, 403);
  assert.equal((await api("PUT", `/logs/${ids.logX}/approve`, { token: tokens.adminA, body })).status, 403);
  assert.equal((await api("PUT", `/logs/${ids.logX}/approve`, { token: tokens.sup1, body })).status, 200);
});

test("an approved log can no longer be edited or deleted by the student", async () => {
  assert.equal(
    (await api("PATCH", `/logs/${ids.logX}`, { token: tokens.studentX, body: { description: "Sneaky" } })).status,
    409
  );
  assert.equal((await api("DELETE", `/logs/${ids.logX}`, { token: tokens.studentX })).status, 409);
});

// ---- Notifications --------------------------------------------------------

test("notifications are private to their owner", async () => {
  const [rows] = await admin.query("SELECT id FROM notifications WHERE user_id = ?", [ids.sup1]);
  assert.ok(rows.length > 0, "submitting the log notified the supervisor");
  const noteId = rows[0].id;

  assert.equal((await api("GET", `/notifications/user/${ids.sup1}`, { token: tokens.studentX })).status, 403);
  assert.equal((await api("PUT", `/notifications/user/${ids.sup1}/read-all`, { token: tokens.studentX })).status, 403);
  assert.equal((await api("PUT", `/notifications/${noteId}/read`, { token: tokens.studentX })).status, 403);
  assert.equal((await api("DELETE", `/notifications/${noteId}`, { token: tokens.studentX })).status, 403);
  assert.equal((await api("GET", `/notifications/user/${ids.sup1}`, { token: tokens.sup1 })).status, 200);
});

// ---- Passwords ------------------------------------------------------------

test("change-password checks the current password", async () => {
  const wrong = await api("POST", "/auth/change-password", {
    token: tokens.studentY,
    body: { current_password: "nope-nope", new_password: "NewPassword1" },
  });
  assert.equal(wrong.status, 400);

  const short = await api("POST", "/auth/change-password", {
    token: tokens.studentY,
    body: { current_password: PASSWORD, new_password: "short" },
  });
  assert.equal(short.status, 400);

  const ok = await api("POST", "/auth/change-password", {
    token: tokens.studentY,
    body: { current_password: PASSWORD, new_password: "NewPassword1" },
  });
  assert.equal(ok.status, 200);

  const oldLogin = await api("POST", "/auth/login", { body: { email: "studentY@test.local", password: PASSWORD } });
  assert.equal(oldLogin.status, 401);
  const newLogin = await api("POST", "/auth/login", { body: { email: "studentY@test.local", password: "NewPassword1" } });
  assert.equal(newLogin.status, 200);

  assert.equal((await api("POST", "/auth/change-password", { body: {} })).status, 401);
});

test("password reset by emailed code", async () => {
  const { outbox } = require("../utils/mailer");
  outbox.length = 0;

  const unknown = await api("POST", "/auth/forgot-password", { body: { email: "nobody@test.local" } });
  assert.equal(unknown.status, 200);
  assert.equal(outbox.length, 0);

  const forgot = await api("POST", "/auth/forgot-password", { body: { email: "itf1@test.local" } });
  assert.equal(forgot.status, 200);
  assert.deepEqual(forgot.body, unknown.body, "same answer whether or not the account exists");
  assert.equal(forgot.body.otp, undefined, "the code is not in the response");
  assert.equal(outbox.length, 1);
  const code = outbox[0].text.match(/\b(\d{6})\b/)[1];

  const [stored] = await admin.query("SELECT otp_hash FROM password_resets WHERE user_id = ?", [ids.itf1]);
  assert.notEqual(stored[0].otp_hash, code, "the code is stored hashed");

  const wrongCode = code === "000000" ? "111111" : "000000";
  const bad = await api("POST", "/auth/verify-reset-otp", { body: { email: "itf1@test.local", otp: wrongCode } });
  assert.equal(bad.status, 400);

  const good = await api("POST", "/auth/verify-reset-otp", { body: { email: "itf1@test.local", otp: code } });
  assert.equal(good.status, 200);
  const resetToken = good.body.data.reset_token;

  const reused = await api("POST", "/auth/verify-reset-otp", { body: { email: "itf1@test.local", otp: code } });
  assert.equal(reused.status, 400, "a code works once");

  const reset = await api("POST", "/auth/reset-password", {
    body: { reset_token: resetToken, new_password: "ResetPassword1" },
  });
  assert.equal(reset.status, 200);

  const again = await api("POST", "/auth/reset-password", {
    body: { reset_token: resetToken, new_password: "Another1234" },
  });
  assert.equal(again.status, 400, "a reset token works once");

  const login = await api("POST", "/auth/login", { body: { email: "itf1@test.local", password: "ResetPassword1" } });
  assert.equal(login.status, 200);
});

test("verify-reset-otp gives up after 5 wrong codes", async () => {
  const { outbox } = require("../utils/mailer");
  outbox.length = 0;
  await api("POST", "/auth/forgot-password", { body: { email: "adminB@test.local" } });
  const code = outbox[0].text.match(/\b(\d{6})\b/)[1];
  const wrong = code === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++) {
    await api("POST", "/auth/verify-reset-otp", { body: { email: "adminB@test.local", otp: wrong } });
  }
  const right = await api("POST", "/auth/verify-reset-otp", { body: { email: "adminB@test.local", otp: code } });
  assert.equal(right.status, 400);
});

// ---- Automatic sign-in ------------------------------------------------------

test("the app's automatic sign-in can load the signed-in profile", async () => {
  // GET /auth/profile used to fail for every user (the generic finder looked
  // for a user_id column on users), so the app signed everyone out on launch.
  for (const key of ["studentX", "sup1", "adminA", "itf1"]) {
    const res = await api("GET", "/auth/profile", { token: tokens[key] });
    assert.equal(res.status, 200, key);
    assert.equal(res.body.data.user.id, ids[key]);
    assert.ok(res.body.data.role_data, `${key} role data`);
  }
});

// ---- Across every response above ------------------------------------------

test("no response in this run contained a bcrypt hash", () => {
  assert.ok(responses.length > 50);
  for (const r of responses) {
    assert.ok(!/\$2[aby]\$\d\d\$/.test(r.text), `${r.method} ${r.url} leaked a password hash`);
  }
});
