const Student = require("../models/Student");
const User = require("../models/User");
const Supervisor = require("../models/Supervisor");
const Dailylog = require("../models/Dailylog");

const storeStudent = async (req, res) => {
    let { user_id, matric_no, department, level, supervisor_id, school_id } = req.body;
    const student = Student.fill({ user_id, matric_no, department, level, supervisor_id, school_id });
    await student.insert();
    res.json({
        status: "success",
        message: "Student added successfully",
        data: student,
    });
};

const getStudents = async (req, res) => {
    const students = await Student.fetch();
    res.json({
        status: "success",
        message: "Students fetched successfully",
        data: students,
    });
};

const getStudentById = async (req, res) => {
    let { id } = req.params;
    
    // Use custom query for students table since it uses user_id instead of id
    const sql = 'SELECT * FROM students WHERE user_id = ?';
    const studentRows = await Student.query(sql, [id]);
    const student = studentRows[0];
    
    if (!student) {
        return res.status(404).json({
            status: "error",
            message: "Student not found",
        });
    }
    
    // Get user information
    const userSql = `
      SELECT 
        u.full_name,
        u.email,
        u.phone,
        s.name as school_name
      FROM users u
      LEFT JOIN schools s ON u.id = ?
      WHERE u.id = ?
    `;
    const userRows = await Student.query(userSql, [student.school_id, id]);
    const userInfo = userRows[0];
    
    // Combine student and user data
    const fullProfile = {
      ...student,
      ...userInfo
    };
    
    res.json({
        status: "success",
        message: "Student fetched successfully",
        data: fullProfile,
    });
};

const partialStudentUpdate = async (req, res) => {
    let { id } = req.params;
    const student = await Student.find(id);
    if (!student) {
        return res.status(404).json({
            status: "error",
            message: "Student not found",
        });
    }
    student.fill(req.body);

    await student.update();

    res.json({
        status: "success",
        message: "Student updated successfully",
        data: student,
    });
};

const deleteStudent = async (req, res) => {
    let { id } = req.params;
    const deleted = await Student.delete(id);
    if (!deleted) {
        return res.status(404).json({
            status: "error",
            message: "Failed to delete student",
        });
    }

    res.json({
        status: "success",
        message: "Student deleted successfully",
    });
};

const updateInternshipDates = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      internship_start_date, 
      internship_end_date, 
      is_first_login,
      workplace_name,
      workplace_address,
      workplace_location,
      supervisor_id,
      supervisor_name,
      supervisor_phone,
      supervisor_email,
    } = req.body;

    // Build update fields dynamically
    const updateFields = [];
    const updateValues = [];

    if (internship_start_date) {
      updateFields.push('internship_start_date = ?');
      updateValues.push(internship_start_date);
    }

    if (internship_end_date) {
      updateFields.push('internship_end_date = ?');
      updateValues.push(internship_end_date);
    }

    if (workplace_name !== undefined) {
      updateFields.push('workplace_name = ?');
      updateValues.push(workplace_name);
    }

    if (workplace_address !== undefined) {
      updateFields.push('workplace_address = ?');
      updateValues.push(workplace_address);
    }

    if (workplace_location !== undefined) {
      updateFields.push('workplace_location = ?');
      updateValues.push(workplace_location);
    }

    if (supervisor_id !== undefined) {
      updateFields.push('supervisor_id = ?');
      updateValues.push(supervisor_id);
    }

    if (supervisor_name !== undefined) {
      updateFields.push('supervisor_name = ?');
      updateValues.push(supervisor_name);
    }

    if (supervisor_phone !== undefined) {
      updateFields.push('supervisor_phone = ?');
      updateValues.push(supervisor_phone);
    }

    if (supervisor_email !== undefined) {
      updateFields.push('supervisor_email = ?');
      updateValues.push(supervisor_email);
    }

    // Always set is_first_login to 0 when updating internship dates
    updateFields.push('is_first_login = ?');
    updateValues.push(0); // Set to 0 (false)

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    const sql = `
      UPDATE students 
      SET ${updateFields.join(', ')} 
      WHERE user_id = ?
    `;

    await Student.query(sql, updateValues);

    // Fetch updated student data
    const studentSql = `
      SELECT 
        s.*,
        u.full_name,
        u.email,
        u.phone
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
    `;
    const studentRows = await Student.query(studentSql, [id]);
    const updatedStudent = studentRows[0];

    res.json({
      status: "success",
      message: "Internship details updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error('Update internship dates error:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to update internship dates: " + error.message,
    });
  }
};

const searchSupervisors = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        status: "success",
        message: "Search query too short",
        data: [],
      });
    }

    // Search supervisors by name, organization, or email
    const sql = `
      SELECT 
        s.user_id,
        s.organization,
        s.position,
        u.full_name,
        u.email,
        u.phone
      FROM supervisors s
      JOIN users u ON s.user_id = u.id
      WHERE 
        u.full_name LIKE ? OR
        s.organization LIKE ? OR
        u.email LIKE ?
      LIMIT 10
    `;
    
    const searchTerm = `%${query}%`;
    const supervisors = await Supervisor.query(sql, [searchTerm, searchTerm, searchTerm]);

    res.json({
      status: "success",
      message: "Supervisors fetched successfully",
      data: supervisors,
    });
  } catch (error) {
    console.error('Search supervisors error:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to search supervisors: " + error.message,
    });
  }
};

const getStudentDashboard = async (req, res) => {
  try {
    const { id } = req.params;

    // Get student details with user info
    const studentSql = `
      SELECT 
        s.*,
        u.full_name,
        u.email,
        u.phone
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
    `;
    const studentRows = await Student.query(studentSql, [id]);
    const student = studentRows[0];

    if (!student) {
      return res.status(404).json({
        status: "error",
        message: "Student not found",
      });
    }

    // Get supervisor details if exists (prioritize database supervisor)
    let supervisor = null;
    let supervisorSource = null; // Track where supervisor data came from
    
    if (student.supervisor_id) {
      // First, try to get supervisor from database using supervisor_id
      const supervisorSql = `
        SELECT 
          s.user_id,
          s.organization,
          s.position,
          u.full_name,
          u.email,
          u.phone
        FROM supervisors s
        JOIN users u ON s.user_id = u.id
        WHERE s.user_id = ?
      `;
      const supervisorRows = await Supervisor.query(supervisorSql, [student.supervisor_id]);
      
      if (supervisorRows.length > 0) {
        supervisor = supervisorRows[0];
        supervisorSource = 'database'; // Linked supervisor from database
      }
    }
    
    // If no database supervisor found, use manually entered supervisor details
    if (!supervisor && student.supervisor_name) {
      supervisor = {
        full_name: student.supervisor_name,
        email: student.supervisor_email || null,
        phone: student.supervisor_phone || null,
        organization: student.workplace_name || null,
        position: 'Industry Supervisor',
        user_id: null, // No database link
      };
      supervisorSource = 'manual'; // Manually entered supervisor
    }

    // Calculate internship progress
    let progressData = {
      percentage: 0,
      daysCompleted: 0,
      daysRemaining: 0,
      totalDays: 0,
    };

    if (student.internship_start_date && student.internship_end_date) {
      const startDate = new Date(student.internship_start_date);
      const endDate = new Date(student.internship_end_date);
      const today = new Date();

      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const daysCompleted = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, totalDays - daysCompleted);
      const percentage = Math.min(100, Math.max(0, (daysCompleted / totalDays) * 100));

      progressData = {
        percentage: Math.round(percentage),
        daysCompleted: Math.max(0, daysCompleted),
        daysRemaining,
        totalDays,
      };
    }

    // Get recent log entries
    const logsSql = `
      SELECT 
        *,
        DATE_FORMAT(log_date, '%Y-%m-%d') as log_date_formatted
      FROM daily_logs
      WHERE student_id = ?
      ORDER BY log_date DESC
      LIMIT 5
    `;
    const recentLogs = await Dailylog.query(logsSql, [id]);
    
    // Replace log_date with formatted version to avoid timezone conversion
    for (let log of recentLogs) {
      log.log_date = log.log_date_formatted;
      delete log.log_date_formatted;
    }

    // Get log statistics
    const statsSql = `
      SELECT 
        COUNT(*) as total_logs,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_logs,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_logs,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_logs
      FROM daily_logs
      WHERE student_id = ?
    `;
    const statsRows = await Dailylog.query(statsSql, [id]);
    const stats = statsRows[0];

    res.json({
      status: "success",
      message: "Dashboard data fetched successfully",
      data: {
        student: {
          user_id: student.user_id,
          full_name: student.full_name,
          email: student.email,
          phone: student.phone,
          matric_no: student.matric_no,
          department: student.department,
          level: student.level,
          internship_start_date: student.internship_start_date,
          internship_end_date: student.internship_end_date,
          workplace_name: student.workplace_name,
          workplace_address: student.workplace_address,
          workplace_location: student.workplace_location,
          supervisor_id: student.supervisor_id, // Include supervisor_id
        },
        supervisor,
        supervisor_source: supervisorSource, // Tell frontend where data came from
        progress: progressData,
        recent_logs: recentLogs,
        statistics: {
          total_logs: parseInt(stats.total_logs) || 0,
          approved_logs: parseInt(stats.approved_logs) || 0,
          pending_logs: parseInt(stats.pending_logs) || 0,
          rejected_logs: parseInt(stats.rejected_logs) || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get student dashboard error:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dashboard data: " + error.message,
    });
  }
};

module.exports = {
    storeStudent,
    getStudents,
    getStudentById,
    partialStudentUpdate,
    deleteStudent,
    updateInternshipDates,
    searchSupervisors,
    getStudentDashboard,
};
