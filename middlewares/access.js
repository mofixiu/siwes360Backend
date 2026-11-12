// middlewares/access.js
// Ownership checks. Each one runs after verifyToken, so req.user is the
// account from the database. Roles:
//   student    - their own record, logs and notifications
//   supervisor - their own record, plus students whose students.supervisor_id is them
//   admin      - school admin; manages accounts, grades students of their own school
//   itf        - read-only oversight of students, logs and grades
const Model = require("../models/Model");

const forbidden = (res, message = "Forbidden - Access denied") =>
  res.status(403).json({ status: "error", message });

const notFound = (res, message) => res.status(404).json({ status: "error", message });

const toId = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const isSelf = (req, id) => toId(id) !== null && toId(id) === req.user.id;

// :param must be the caller's own user id, or the caller has one of `roles`.
const selfOrRoles = (param, ...roles) => (req, res, next) => {
  if (isSelf(req, req.params[param]) || roles.includes(req.user.role)) return next();
  return forbidden(res);
};

// The school an admin belongs to, or null.
const adminSchoolId = async (adminId) => {
  const rows = await Model.query("SELECT school_id FROM admins WHERE user_id = ?", [adminId]);
  return rows.length > 0 ? rows[0].school_id : null;
};

// Is this student enrolled at the admin's school?
const isAdminsStudent = async (adminId, studentId) => {
  const rows = await Model.query(
    `SELECT 1 FROM students s JOIN admins a ON a.school_id = s.school_id
      WHERE s.user_id = ? AND a.user_id = ?`,
    [studentId, adminId]
  );
  return rows.length > 0;
};

// Can the caller see this student's record, logs, sign-offs and grades?
// Admins see only their own school's students; ITF sees every student.
const canViewStudent = async (user, studentId) => {
  const id = toId(studentId);
  if (id === null) return false;
  if (user.role === "itf") return true;
  if (user.role === "admin") return isAdminsStudent(user.id, id);
  if (user.role === "student") return id === user.id;
  if (user.role === "supervisor") {
    const rows = await Model.query("SELECT 1 FROM students WHERE user_id = ? AND supervisor_id = ?", [
      id,
      user.id,
    ]);
    return rows.length > 0;
  }
  return false;
};

// :param is a student id the caller may view.
const studentViewer = (param) => async (req, res, next) => {
  if (await canViewStudent(req.user, req.params[param])) return next();
  return forbidden(res);
};

// Loads daily log :id with its student's supervisor into req.dailyLog.
const loadDailyLog = async (req, res, next) => {
  const id = toId(req.params.id);
  if (id === null) return notFound(res, "Dailylog not found");
  const rows = await Model.query(
    `SELECT dl.id, dl.student_id, dl.status, s.supervisor_id
       FROM daily_logs dl
       JOIN students s ON s.user_id = dl.student_id
      WHERE dl.id = ?`,
    [id]
  );
  if (rows.length === 0) return notFound(res, "Dailylog not found");
  req.dailyLog = rows[0];
  next();
};

const dailyLogViewer = async (req, res, next) => {
  if (await canViewStudent(req.user, req.dailyLog.student_id)) return next();
  return forbidden(res);
};

// The student who wrote the log may change or delete it while it is pending
// or rejected, which is what the app's logbook screen allows.
const dailyLogAuthor = (req, res, next) => {
  if (req.user.role !== "student" || req.dailyLog.student_id !== req.user.id) {
    return forbidden(res);
  }
  if (req.dailyLog.status === "approved") {
    return res.status(409).json({ status: "error", message: "Approved logs can no longer be changed" });
  }
  next();
};

// Only the supervisor assigned to the log's student may approve or reject it.
const dailyLogSupervisor = (req, res, next) => {
  if (req.user.role !== "supervisor" || req.dailyLog.supervisor_id !== req.user.id) {
    return forbidden(res, "Only this student's supervisor can review the log");
  }
  next();
};

// Notification :id must belong to the caller.
const notificationOwner = async (req, res, next) => {
  const id = toId(req.params.id);
  if (id === null) return notFound(res, "Notification not found");
  const rows = await Model.query("SELECT user_id FROM notifications WHERE id = ?", [id]);
  if (rows.length === 0) return notFound(res, "Notification not found");
  if (rows[0].user_id !== req.user.id) return forbidden(res);
  next();
};

// Loads grade :id into req.grade and checks the caller may see that student.
const gradeViewer = async (req, res, next) => {
  const id = toId(req.params.id);
  if (id === null) return notFound(res, "Grade not found");
  const rows = await Model.query("SELECT * FROM grades WHERE id = ?", [id]);
  if (rows.length === 0) return notFound(res, "Grade not found");
  if (!(await canViewStudent(req.user, rows[0].student_id))) return forbidden(res);
  req.grade = rows[0];
  next();
};

// Admin routes on student :param: the student must be at the admin's school,
// and a school_id in the body may only be the admin's own school.
const adminStudentOwner = (param) => async (req, res, next) => {
  const id = toId(req.params[param]);
  if (id === null || !(await isAdminsStudent(req.user.id, id))) {
    return notFound(res, "Student not found");
  }
  if (req.body && req.body.school_id !== undefined) {
    if (toId(req.body.school_id) !== (await adminSchoolId(req.user.id))) {
      return forbidden(res, "You can only place students in your own school");
    }
  }
  next();
};

// :param is the caller themself, or a student of the caller's school (admins).
const selfOrSchoolAdmin = (param) => async (req, res, next) => {
  if (isSelf(req, req.params[param])) return next();
  if (req.user.role === "admin" && (await isAdminsStudent(req.user.id, toId(req.params[param])))) return next();
  return forbidden(res);
};

module.exports = {
  toId,
  isSelf,
  selfOrRoles,
  canViewStudent,
  studentViewer,
  loadDailyLog,
  dailyLogViewer,
  dailyLogAuthor,
  dailyLogSupervisor,
  notificationOwner,
  gradeViewer,
  adminSchoolId,
  isAdminsStudent,
  adminStudentOwner,
  selfOrSchoolAdmin,
};
