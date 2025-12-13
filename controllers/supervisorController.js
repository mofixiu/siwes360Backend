const Supervisor = require("../models/Supervisor");
const Student = require("../models/Student");

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
    const supervisor = await Supervisor.find(id);
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
    let { id } = req.params;
    const supervisor = await Supervisor.find(id);
    if (!supervisor) {
        return res.status(404).json({
            status: "error",
            message: "Supervisor not found",
        });
    }
    supervisor.fill(req.body);

    await supervisor.update();

    res.json({
        status: "success",
        message: "Supervisor updated successfully",
        data: supervisor,
    });
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

    // Get all students assigned to this supervisor
    const sql = `
      SELECT 
        s.user_id,
        s.matric_no,
        s.department,
        s.level,
        s.internship_start_date,
        s.internship_end_date,
        s.workplace_name,
        s.workplace_location,
        u.full_name,
        u.email,
        u.phone,
        (SELECT COUNT(*) FROM daily_logs WHERE student_id = s.user_id AND status = 'pending') as pending_logs,
        (SELECT COUNT(*) FROM daily_logs WHERE student_id = s.user_id AND status = 'approved') as approved_logs,
        (SELECT COUNT(*) FROM daily_logs WHERE student_id = s.user_id) as total_logs
      FROM students s
      JOIN users u ON s.user_id = u.id
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

    // Get recent pending approvals with student details
    const recentApprovalsSql = `
      SELECT 
        dl.id,
        dl.log_date,
        dl.description,
        dl.status,
        s.user_id as student_id,
        s.matric_no,
        u.full_name as student_name
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

module.exports = {
    storeSupervisor,
    getSupervisors,
    getSupervisorById,
    partialSupervisorUpdate,
    deleteSupervisor,
    getSupervisorStudents,
    getSupervisorDashboard,
};
