// Weekly sign-off: the supervisor signs a week of a student's logbook once every
// entry in it has been reviewed, with an optional comment, like the weekly
// signature on the paper logbook. Needs database/003_weekly_signoffs.sql.
const Model = require("../models/Model");
const weeks = require("../utils/weeks");
const { toId } = require("../middlewares/access");
const { createNotification } = require("./notificationController");

const MIGRATION_MISSING = {
  status: "error",
  message: "Weekly sign-off is not set up on this server yet (run database/003_weekly_signoffs.sql)",
};

const signoffsForStudent = async (studentId) =>
  Model.query(
    `SELECT id, student_id, supervisor_id, supervisor_name, week_number, week_start, week_end, comment,
            DATE_FORMAT(signed_at, '%Y-%m-%d %H:%i:%s') AS signed_at
       FROM weekly_signoffs WHERE student_id = ? ORDER BY week_number ASC`,
    [studentId]
  );

// GET /api/signoffs/student/:studentId (anyone who may view the student)
const getStudentSignoffs = async (req, res) => {
  try {
    const rows = await signoffsForStudent(req.params.studentId);
    res.json({ status: "success", data: rows });
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") return res.status(503).json(MIGRATION_MISSING);
    throw error;
  }
};

// POST /api/signoffs { student_id, week_number, comment }
// Only the student's own supervisor, only once per week, only when the week has
// entries and none is still pending, and not before that week's Friday.
const storeSignoff = async (req, res) => {
  const studentId = toId(req.body.student_id);
  const weekNumber = toId(req.body.week_number);
  const comment = typeof req.body.comment === "string" && req.body.comment.trim() ? req.body.comment.trim() : null;

  if (studentId === null || weekNumber === null) {
    return res.status(400).json({ status: "error", message: "student_id and week_number are required" });
  }

  const students = await Model.query(
    "SELECT supervisor_id, internship_start_date FROM students WHERE user_id = ?",
    [studentId]
  );
  if (students.length === 0) return res.status(404).json({ status: "error", message: "Student not found" });
  const student = students[0];
  if (student.supervisor_id !== req.user.id) {
    return res.status(403).json({ status: "error", message: "Only this student's supervisor can sign off their week" });
  }
  if (!student.internship_start_date) {
    return res.status(409).json({ status: "error", message: "This student has not set their internship dates" });
  }

  const { week_start, week_end } = weeks.weekRange(student.internship_start_date, weekNumber);
  const friday = weeks.addDays(week_start, 4);
  if (weeks.today() < friday) {
    return res.status(409).json({ status: "error", message: `Week ${weekNumber} can be signed off from Friday ${friday}` });
  }

  const [counts] = await Model.query(
    `SELECT COUNT(*) AS entries, SUM(status = 'pending') AS pending
       FROM daily_logs WHERE student_id = ? AND log_date BETWEEN ? AND ?`,
    [studentId, week_start, week_end]
  );
  if (Number(counts.entries) === 0) {
    return res.status(409).json({ status: "error", message: `Week ${weekNumber} has no entries to sign off` });
  }
  if (Number(counts.pending) > 0) {
    return res.status(409).json({
      status: "error",
      message: `Review the ${counts.pending} pending ${Number(counts.pending) === 1 ? "entry" : "entries"} in week ${weekNumber} first`,
    });
  }

  const [supervisor] = await Model.query("SELECT full_name FROM users WHERE id = ?", [req.user.id]);
  try {
    await Model.query(
      `INSERT INTO weekly_signoffs (student_id, supervisor_id, supervisor_name, week_number, week_start, week_end, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [studentId, req.user.id, supervisor.full_name, weekNumber, week_start, week_end, comment]
    );
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") return res.status(503).json(MIGRATION_MISSING);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ status: "error", message: `Week ${weekNumber} is already signed off` });
    }
    throw error;
  }

  await createNotification(
    studentId,
    `${supervisor.full_name} signed off week ${weekNumber} of your logbook${comment ? " with a comment" : ""}`,
    "signoff"
  );

  const rows = await signoffsForStudent(studentId);
  res.status(201).json({
    status: "success",
    message: `Week ${weekNumber} signed off`,
    data: rows.find((r) => r.week_number === weekNumber),
  });
};

module.exports = { getStudentSignoffs, storeSignoff, signoffsForStudent };
