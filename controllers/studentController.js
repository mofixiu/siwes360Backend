const Student = require("../models/Student");

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
    const student = await Student.find(id);
    if (!student) {
        return res.status(404).json({
            status: "error",
            message: "Student not found",
        });
    }
    res.json({
        status: "success",
        message: "Student fetched successfully",
        data: student,
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


module.exports = {
    storeStudent,
    getStudents,
    getStudentById,
    partialStudentUpdate,
    deleteStudent,
};
