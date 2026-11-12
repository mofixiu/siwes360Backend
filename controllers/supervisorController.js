const Supervisor = require("../models/Supervisor");
const Student = require("../models/Student");
const weeks = require("../utils/weeks");
const { signoffsFor } = require("../services/oversight");

const storeSupervisor = async (req, res) => {
    let { user_id, organization, position } = req.body;
    const supervisor = Supervisor.fill({ user_id, organization, position });
    await supervisor.insert();
    res.json({
        status: "success",
        message: "Supervisor added successfully",
        data: supervisor,
    });
};

const getSupervisors = async (req, res) => {
    const supervisors = await Supervisor.fetch();
    res.json({
        status: "success",
        message: "Supervisors fetched successfully",
        data: supervisors,
    });
};

const getSupervisorById = async (req, res) => {
    let { id } = req.params;
    
    // For supervisors table, we need to join with users table and use user_id
    const sql = `
      SELECT 
        s.*,
        u.full_name,
        u.email,
        u.phone
      FROM supervisors s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
    `;
    
    const supervisorRows = await Supervisor.query(sql, [id]);
    const supervisor = supervisorRows[0];
    
    if (!supervisor) {
        return res.status(404).json({
            status: "error",
            message: "Supervisor not found",
        });
    }
    
    res.json({
        status: "success",
        message: "Supervisor fetched successfully",
        data: supervisor,
    });
};

const partialSupervisorUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Use direct SQL update instead of model methods
        const updateFields = [];
        const updateValues = [];
        
        // Build dynamic update query based on provided fields
        if (req.body.organization !== undefined) {
            updateFields.push('organization = ?');
            updateValues.push(req.body.organization);
        }
        if (req.body.position !== undefined) {
            updateFields.push('position = ?');
            updateValues.push(req.body.position);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "No fields to update",
            });
        }
        
        // Add updated_at timestamp
        updateFields.push('updated_at = NOW()');
        
        // Add user_id to values array for WHERE clause
        updateValues.push(id);
        
        const sql = `UPDATE supervisors SET ${updateFields.join(', ')} WHERE user_id = ?`;
        await Supervisor.query(sql, updateValues);
        
        // Fetch updated supervisor with user info
        const fetchSql = `
            SELECT 
                s.*,
                u.full_name,
                u.email,
                u.phone
            FROM supervisors s
            JOIN users u ON s.user_id = u.id
            WHERE s.user_id = ?
        `;
        const supervisorRows = await Supervisor.query(fetchSql, [id]);
        const supervisor = supervisorRows[0];

        res.json({
            status: "success",
            message: "Supervisor updated successfully",
            data: supervisor,
        });
    } catch (error) {
        console.error('Update supervisor error:', error);
        res.status(500).json({
            status: "error",
            message: "Failed to update supervisor: " + error.message,
        });
    }
};

const deleteSupervisor = async (req, res) => {
    let { id } = req.params;
    const deleted = await Supervisor.delete(id);
    if (!deleted) {
        return res.status(404).json({
            status: "error",
            message: "Failed to delete supervisor",
        });
    }

    res.json({
        status: "success",
        message: "Supervisor deleted successfully",
    });
};

const getSupervisorStudents = async (req, res) => {
  try {
    const { id } = req.params;

    // Get all students assigned to this supervisor with school information
    const sql = `
      SELECT 
        s.user_id,
        s.matric_no,
        s.department,
        s.level,
        s.school_id,
        s.internship_start_date,
        s.internship_end_date,
        s.workplace_name,
        s.workplace_location,
        u.full_name,
        u.email,
        u.phone,
        sc.name as school_name,
        sc.address as school_address,
        (SELECT COUNT(*) FROM daily_logs WHERE student_id = s.user_id AND status = 'pending') as pending_logs,
        (SELECT COUNT(*) FROM daily_logs WHERE student_id = s.user_id AND status = 'approved') as approved_logs,
        (SELECT COUNT(*) FROM daily_logs WHERE student_id = s.user_id) as total_logs
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN schools sc ON s.school_id = sc.id
      WHERE s.supervisor_id = ?
      ORDER BY u.full_name ASC
    `;
    
    const students = await Student.query(sql, [id]);

    res.json({
      status: "success",
      message: "Students fetched successfully",
      data: students,
    });
  } catch (error) {
    console.error('Get supervisor students error:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch students: " + error.message,
    });
  }
};

const getSupervisorDashboard = async (req, res) => {
  try {
    const { id } = req.params;

    // Get supervisor details with user info
    const supervisorSql = `
      SELECT 
        s.*,
        u.full_name,
        u.email,
        u.phone
      FROM supervisors s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
    `;
    const supervisorRows = await Supervisor.query(supervisorSql, [id]);
    const supervisor = supervisorRows[0];

    if (!supervisor) {
      return res.status(404).json({
        status: "error",
        message: "Supervisor not found",
      });
    }

    // Get count of assigned students
    const studentCountSql = `
      SELECT COUNT(*) as total_students
      FROM students
      WHERE supervisor_id = ?
    `;
    const studentCountRows = await Student.query(studentCountSql, [id]);
    const studentCount = studentCountRows[0].total_students;

    // Get pending approvals count
    const pendingApprovalsSql = `
      SELECT COUNT(*) as pending_count
      FROM daily_logs dl
      JOIN students s ON dl.student_id = s.user_id
      WHERE s.supervisor_id = ? AND dl.status = 'pending'
    `;
    const pendingRows = await Student.query(pendingApprovalsSql, [id]);
    const pendingCount = pendingRows[0].pending_count;

    // Get completed reviews count
    const completedReviewsSql = `
      SELECT COUNT(*) as completed_count
      FROM daily_logs dl
      JOIN students s ON dl.student_id = s.user_id
      WHERE s.supervisor_id = ? AND dl.status IN ('approved', 'rejected')
    `;
    const completedRows = await Student.query(completedReviewsSql, [id]);
    const completedCount = completedRows[0].completed_count;

    // Get recent pending approvals
    const recentApprovalsSql = `
      SELECT 
        dl.id,
        dl.student_id,
        DATE_FORMAT(dl.log_date, '%Y-%m-%d') as log_date,
        dl.description,
        dl.status,
        u.full_name as student_name,
        s.matric_no
      FROM daily_logs dl
      JOIN students s ON dl.student_id = s.user_id
      JOIN users u ON s.user_id = u.id
      WHERE s.supervisor_id = ? AND dl.status = 'pending'
      ORDER BY dl.created_at DESC
      LIMIT 5
    `;
    const recentApprovals = await Student.query(recentApprovalsSql, [id]);

    res.json({
      status: "success",
      message: "Dashboard data fetched successfully",
      data: {
        supervisor: {
          user_id: supervisor.user_id,
          full_name: supervisor.full_name,
          email: supervisor.email,
          phone: supervisor.phone,
          organization: supervisor.organization,
          position: supervisor.position,
        },
        statistics: {
          total_students: studentCount,
          pending_approvals: pendingCount,
          completed_reviews: completedCount,
        },
        recent_approvals: recentApprovals,
      },
    });
  } catch (error) {
    console.error('Get supervisor dashboard error:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dashboard data: " + error.message,
    });
  }
};

// GET /api/supervisors/:id/queue (the supervisor themself)
// The supervisor's work, a week at a time:
//   review - weeks with entries still pending, oldest first
//   sign   - weeks with every entry reviewed, not signed off yet, from that week's Friday
const getSupervisorQueue = async (req, res) => {
  const { id } = req.params;
  const today = weeks.today();

  const students = await Student.query(
    `SELECT s.user_id, u.full_name, s.matric_no, s.internship_start_date
       FROM students s JOIN users u ON u.id = s.user_id
      WHERE s.supervisor_id = ?
      ORDER BY u.full_name ASC`,
    [id]
  );
  const ids = students.map((s) => s.user_id);
  const logs = ids.length
    ? await Student.query(
        `SELECT id, student_id, log_date, description, status, supervisor_comment
           FROM daily_logs WHERE student_id IN (${ids.map(() => "?").join(", ")})
          ORDER BY log_date ASC`,
        ids
      )
    : [];
  const signoffs = await signoffsFor(ids);
  const signed = new Set((signoffs || []).map((s) => `${s.student_id}:${s.week_number}`));

  const groups = new Map();
  const studentById = new Map(students.map((s) => [s.user_id, s]));
  for (const log of logs) {
    const student = studentById.get(log.student_id);
    if (!student.internship_start_date) continue;
    const weekNumber = weeks.weekNumber(student.internship_start_date, log.log_date);
    const key = `${log.student_id}:${weekNumber}`;
    if (!groups.has(key)) {
      groups.set(key, {
        student_id: student.user_id,
        full_name: student.full_name,
        matric_no: student.matric_no,
        week_number: weekNumber,
        ...weeks.weekRange(student.internship_start_date, weekNumber),
        signed_off: signed.has(key),
        entries: [],
      });
    }
    groups.get(key).entries.push(log);
  }

  const review = [];
  const sign = [];
  for (const group of groups.values()) {
    const count = (status) => group.entries.filter((e) => e.status === status).length;
    const summary = { ...group, pending: count("pending"), approved: count("approved"), rejected: count("rejected") };
    if (summary.pending > 0) review.push(summary);
    else if (signoffs && !group.signed_off && today >= weeks.addDays(group.week_start, 4)) sign.push(summary);
  }
  const oldestFirst = (a, b) => a.week_start.localeCompare(b.week_start) || a.full_name.localeCompare(b.full_name);
  review.sort(oldestFirst);
  sign.sort(oldestFirst);

  res.json({
    status: "success",
    data: {
      today,
      signoffs_available: signoffs !== null,
      stats: {
        students: students.length,
        pending_entries: review.reduce((n, g) => n + g.pending, 0),
        weeks_to_sign: sign.length,
      },
      review,
      sign,
    },
  });
};

module.exports = {
    storeSupervisor,
    getSupervisors,
    getSupervisorById,
    partialSupervisorUpdate,
    deleteSupervisor,
    getSupervisorStudents,
    getSupervisorDashboard,
    getSupervisorQueue,
};
