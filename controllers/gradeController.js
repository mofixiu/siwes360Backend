const Grade = require("../models/Grade");
const { adminSchoolId, toId } = require("../middlewares/access");

// Admin only. The grader is always the signed-in admin (graded_by in the body is
// ignored), and the student must belong to the admin's school.
const storeGrade = async (req, res) => {
    const studentId = toId(req.body.student_id);
    const score = Number(req.body.score);
    const remarks = req.body.remarks ?? null;

    if (studentId === null) {
        return res.status(400).json({ status: "error", message: "student_id is required" });
    }
    if (!Number.isInteger(score) || score < 0 || score > 100) {
        return res.status(400).json({ status: "error", message: "score must be a whole number from 0 to 100" });
    }

    const schoolId = await adminSchoolId(req.user.id);
    const students = await Grade.query("SELECT school_id FROM students WHERE user_id = ?", [studentId]);
    if (students.length === 0) {
        return res.status(404).json({ status: "error", message: "Student not found" });
    }
    if (schoolId === null || students[0].school_id !== schoolId) {
        return res.status(403).json({ status: "error", message: "You can only grade students of your own school" });
    }

    const grade = Grade.fill({ student_id: studentId, graded_by: req.user.id, score, remarks });
    await grade.insert();
    res.json({
        status: "success",
        message: "Grade added successfully",
        data: grade,
    });
};

// Admin: grades of their own school's students. ITF: every grade.
const getGrades = async (req, res) => {
    const grades = req.user.role === "admin"
        ? await Grade.query(
              `SELECT g.* FROM grades g JOIN students s ON s.user_id = g.student_id
                WHERE s.school_id = ?`,
              [await adminSchoolId(req.user.id)]
          )
        : await Grade.fetch();
    res.json({
        status: "success",
        message: "Grades fetched successfully",
        data: grades,
    });
};

// gradeViewer has already loaded the grade and checked access.
const getGradeById = async (req, res) => {
    res.json({
        status: "success",
        message: "Grade fetched successfully",
        data: req.grade,
    });
};

// Admin only, and only grades of students in the admin's school.
const deleteGrade = async (req, res) => {
    const { id } = req.params;
    const schoolId = await adminSchoolId(req.user.id);
    const rows = await Grade.query(
        `SELECT g.id FROM grades g JOIN students s ON s.user_id = g.student_id
          WHERE g.id = ? AND s.school_id = ?`,
        [id, schoolId]
    );
    if (rows.length === 0) {
        return res.status(404).json({ status: "error", message: "Grade not found" });
    }

    await Grade.query("DELETE FROM grades WHERE id = ?", [id]);
    res.json({
        status: "success",
        message: "Grade deleted successfully",
    });
};

// studentViewer has already checked the caller may see this student.
const getStudentGrades = async (req, res) => {
    const { studentId } = req.params;

    try {
        const grades = await Grade.query("SELECT * FROM grades WHERE student_id = ?", [studentId]);

        res.json({
            status: "success",
            message: "Student grades fetched successfully",
            data: grades,
        });
    } catch (error) {
        console.error("Get student grades error:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch student grades",
        });
    }
};

module.exports = {
    storeGrade,
    getGrades,
    getGradeById,
    deleteGrade,
    getStudentGrades,
};
