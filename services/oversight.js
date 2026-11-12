// Read-only figures for the school admin (SIWES coordinator) and ITF screens,
// built from students, daily_logs and weekly_signoffs. Callers decide which
// school(s) a user may see; nothing here checks roles.
const Model = require("../models/Model");
const weeks = require("../utils/weeks");

// A student with no entry for this many working days is "behind".
const BEHIND_AFTER_WORKING_DAYS = 3;

// Sign-offs, or null when database/003_weekly_signoffs.sql has not been run.
const signoffsFor = async (studentIds) => {
  if (studentIds.length === 0) return [];
  try {
    return await Model.query(
      `SELECT student_id, week_number FROM weekly_signoffs
        WHERE student_id IN (${studentIds.map(() => "?").join(", ")})`,
      studentIds
    );
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") return null;
    throw error;
  }
};

const STUDENT_SELECT = `
  SELECT s.user_id, u.full_name, u.email, s.matric_no, s.department, s.level, s.school_id,
         sc.name AS school_name,
         s.internship_start_date, s.internship_end_date, s.is_first_login,
         s.workplace_name, s.workplace_location, s.supervisor_id,
         COALESCE(su.full_name, s.supervisor_name) AS supervisor_name,
         COALESCE(ls.total_logs, 0) AS total_logs,
         COALESCE(ls.pending_logs, 0) AS pending_logs,
         COALESCE(ls.approved_logs, 0) AS approved_logs,
         COALESCE(ls.rejected_logs, 0) AS rejected_logs,
         ls.last_log_date,
         ls.oldest_pending_date
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN schools sc ON sc.id = s.school_id
    LEFT JOIN users su ON su.id = s.supervisor_id
    LEFT JOIN (
      SELECT student_id,
             COUNT(*) AS total_logs,
             SUM(status = 'pending') AS pending_logs,
             SUM(status = 'approved') AS approved_logs,
             SUM(status = 'rejected') AS rejected_logs,
             MAX(log_date) AS last_log_date,
             MIN(CASE WHEN status = 'pending' THEN log_date END) AS oldest_pending_date
        FROM daily_logs GROUP BY student_id
    ) ls ON ls.student_id = s.user_id`;

// Week numbers in which each student has at least one entry.
const loggedWeeksFor = async (students) => {
  const ids = students.map((s) => s.user_id);
  const byStudent = new Map(ids.map((id) => [id, new Set()]));
  if (ids.length === 0) return byStudent;
  const rows = await Model.query(
    `SELECT DISTINCT student_id, log_date FROM daily_logs
      WHERE student_id IN (${ids.map(() => "?").join(", ")})`,
    ids
  );
  const startOf = new Map(students.map((s) => [s.user_id, s.internship_start_date]));
  for (const row of rows) {
    const start = startOf.get(row.student_id);
    if (start) byStudent.get(row.student_id).add(weeks.weekNumber(start, row.log_date));
  }
  return byStudent;
};

// Adds where each student stands today:
//   standing: not_set_up | not_started | logging | behind | finished
//   current_week, working_days_since_last_entry, expected_entries
//   unsigned_weeks: finished weeks that have entries but no sign-off
//   last_week: { week_number, logged, signed } for the week before this one
const describe = (student, loggedWeeks, signedWeeks, today) => {
  const start = student.internship_start_date;
  const end = student.internship_end_date;
  const out = {
    ...student,
    total_logs: Number(student.total_logs),
    pending_logs: Number(student.pending_logs),
    approved_logs: Number(student.approved_logs),
    rejected_logs: Number(student.rejected_logs),
    is_first_login: Boolean(student.is_first_login),
    current_week: null,
    total_weeks: null,
    expected_entries: 0,
    working_days_since_last_entry: null,
    unsigned_weeks: [],
    weeks_signed: signedWeeks ? signedWeeks.size : null,
    last_week: null,
    standing: "logging",
  };

  if (!start || !end || student.is_first_login) {
    out.standing = "not_set_up";
    return out;
  }

  out.total_weeks = weeks.weekNumber(start, end);
  if (today < start) {
    out.standing = "not_started";
    return out;
  }

  const lastDay = today < end ? weeks.addDays(today, -1) : end; // today can still be logged
  out.current_week = Math.min(weeks.weekNumber(start, today), out.total_weeks);
  out.expected_entries = weeks.workingDaysBetween(start, lastDay);
  out.working_days_since_last_entry = weeks.workingDaysSince(student.last_log_date || weeks.addDays(start, -1), lastDay);

  const finishedWeeks = today > end ? out.total_weeks : out.current_week - 1;
  for (let w = 1; w <= finishedWeeks; w += 1) {
    if (loggedWeeks.has(w) && signedWeeks && !signedWeeks.has(w)) out.unsigned_weeks.push(w);
  }
  if (out.current_week > 1 && today <= end) {
    const w = out.current_week - 1;
    out.last_week = { week_number: w, logged: loggedWeeks.has(w), signed: signedWeeks ? signedWeeks.has(w) : null };
  }

  if (today > end) out.standing = "finished";
  else if (out.working_days_since_last_entry >= BEHIND_AFTER_WORKING_DAYS) out.standing = "behind";
  return out;
};

// Students matching `where` (an SQL condition on s.*), with where they stand.
// Also says whether sign-offs are available (the migration has been run).
const studentsWhere = async (where, params) => {
  const rows = await Model.query(`${STUDENT_SELECT} WHERE ${where} ORDER BY u.full_name ASC`, params);
  const signoffs = await signoffsFor(rows.map((r) => r.user_id));
  const loggedWeeks = await loggedWeeksFor(rows);
  const today = weeks.today();

  const signedBy = new Map(rows.map((r) => [r.user_id, signoffs ? new Set() : null]));
  for (const s of signoffs || []) signedBy.get(s.student_id)?.add(s.week_number);

  return {
    today,
    signoffs_available: signoffs !== null,
    students: rows.map((r) => describe(r, loggedWeeks.get(r.user_id), signedBy.get(r.user_id), today)),
  };
};

// Headline figures for a set of described students.
const summarise = (students) => {
  const totals = {
    students: students.length,
    placed: 0,
    not_set_up: 0,
    not_started: 0,
    logging: 0,
    behind: 0,
    finished: 0,
    no_supervisor: 0,
    pending_entries: 0,
    unsigned_weeks: 0,
  };
  const lastWeek = { due: 0, signed: 0 };
  for (const s of students) {
    totals[s.standing] += 1;
    if (s.standing !== "not_set_up") totals.placed += 1;
    if (!s.supervisor_id) totals.no_supervisor += 1;
    totals.pending_entries += s.pending_logs;
    totals.unsigned_weeks += s.unsigned_weeks.length;
    if (s.last_week && s.last_week.logged) {
      lastWeek.due += 1;
      if (s.last_week.signed) lastWeek.signed += 1;
    }
  }
  return { totals, last_week: lastWeek };
};

// Supervisors of the given students, with how much of those students' work is
// waiting for them. Only counts the given students' entries.
const supervisorsOf = (students) => {
  const bySupervisor = new Map();
  for (const s of students) {
    if (!s.supervisor_id) continue;
    if (!bySupervisor.has(s.supervisor_id)) {
      bySupervisor.set(s.supervisor_id, {
        supervisor_id: s.supervisor_id,
        full_name: s.supervisor_name,
        students: 0,
        pending_entries: 0,
        oldest_pending_date: null,
        unsigned_weeks: 0,
      });
    }
    const row = bySupervisor.get(s.supervisor_id);
    row.students += 1;
    row.pending_entries += s.pending_logs;
    row.unsigned_weeks += s.unsigned_weeks.length;
    if (s.oldest_pending_date && (!row.oldest_pending_date || s.oldest_pending_date < row.oldest_pending_date)) {
      row.oldest_pending_date = s.oldest_pending_date;
    }
  }
  return [...bySupervisor.values()].sort(
    (a, b) =>
      b.pending_entries + b.unsigned_weeks - (a.pending_entries + a.unsigned_weeks) ||
      String(a.oldest_pending_date || "9").localeCompare(String(b.oldest_pending_date || "9"))
  );
};

module.exports = { BEHIND_AFTER_WORKING_DAYS, studentsWhere, summarise, supervisorsOf, signoffsFor };
