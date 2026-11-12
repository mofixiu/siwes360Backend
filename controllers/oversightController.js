// Admin (institution SIWES coordinator) and ITF dashboards. Read-only.
//   admin - only students whose school_id is the admin's school
//   itf   - every institution
const Model = require("../models/Model");
const { adminSchoolId, toId } = require("../middlewares/access");
const { BEHIND_AFTER_WORKING_DAYS, studentsWhere, summarise, supervisorsOf } = require("../services/oversight");

const FILTERS = {
  all: () => true,
  behind: (s) => s.standing === "behind",
  not_set_up: (s) => s.standing === "not_set_up",
  unsigned: (s) => s.unsigned_weeks.length > 0,
  waiting: (s) => s.pending_logs > 0,
  no_supervisor: (s) => !s.supervisor_id,
};

const filtered = (students, filter) => students.filter(FILTERS[filter] || FILTERS.all);

// Longest without an entry first.
const byUrgency = (a, b) =>
  (b.working_days_since_last_entry ?? -1) - (a.working_days_since_last_entry ?? -1) ||
  a.full_name.localeCompare(b.full_name);

const schoolOf = async (schoolId) => (await Model.query("SELECT id, name, address FROM schools WHERE id = ?", [schoolId]))[0];

// The signed-in admin's school, or answers 409 and returns null.
const requireAdminSchool = async (req, res) => {
  const schoolId = await adminSchoolId(req.user.id);
  if (schoolId === null) {
    res.status(409).json({ status: "error", message: "Your admin account is not linked to an institution" });
    return null;
  }
  return schoolId;
};

const rules = { behind_after_working_days: BEHIND_AFTER_WORKING_DAYS };

// GET /api/admin/overview
const adminOverview = async (req, res) => {
  const schoolId = await requireAdminSchool(req, res);
  if (schoolId === null) return;

  const { today, signoffs_available, students } = await studentsWhere("s.school_id = ?", [schoolId]);
  const { totals, last_week } = summarise(students);
  res.json({
    status: "success",
    data: {
      school: await schoolOf(schoolId),
      today,
      signoffs_available,
      rules,
      totals,
      last_week,
      behind: students.filter(FILTERS.behind).sort(byUrgency).slice(0, 5),
      supervisors: supervisorsOf(students)
        .filter((s) => s.pending_entries + s.unsigned_weeks > 0)
        .slice(0, 5),
    },
  });
};

// GET /api/admin/students?filter=all|behind|not_set_up|unsigned|waiting|no_supervisor
const adminStudents = async (req, res) => {
  const schoolId = await requireAdminSchool(req, res);
  if (schoolId === null) return;

  const { today, signoffs_available, students } = await studentsWhere("s.school_id = ?", [schoolId]);
  res.json({
    status: "success",
    data: { today, signoffs_available, rules, students: filtered(students, req.query.filter) },
  });
};

// GET /api/admin/supervisors
const adminSupervisors = async (req, res) => {
  const schoolId = await requireAdminSchool(req, res);
  if (schoolId === null) return;

  const { students } = await studentsWhere("s.school_id = ?", [schoolId]);
  res.json({ status: "success", data: { supervisors: supervisorsOf(students) } });
};

// GET /api/itf/overview
const itfOverview = async (req, res) => {
  const { today, signoffs_available, students } = await studentsWhere("1 = 1", []);
  const schools = await Model.query("SELECT id, name, address FROM schools ORDER BY name ASC");
  const bySchool = new Map(schools.map((s) => [s.id, []]));
  for (const s of students) bySchool.get(s.school_id)?.push(s);

  res.json({
    status: "success",
    data: {
      today,
      signoffs_available,
      rules,
      ...summarise(students),
      schools: schools.map((school) => ({ ...school, ...summarise(bySchool.get(school.id)) })),
    },
  });
};

// GET /api/itf/schools/:id/students?filter=...
const itfSchoolStudents = async (req, res) => {
  const schoolId = toId(req.params.id);
  const school = schoolId === null ? null : await schoolOf(schoolId);
  if (!school) return res.status(404).json({ status: "error", message: "Institution not found" });

  const { today, signoffs_available, students } = await studentsWhere("s.school_id = ?", [schoolId]);
  res.json({
    status: "success",
    data: {
      school,
      today,
      signoffs_available,
      rules,
      ...summarise(students),
      students: filtered(students, req.query.filter),
    },
  });
};

module.exports = { adminOverview, adminStudents, adminSupervisors, itfOverview, itfSchoolStudents };
