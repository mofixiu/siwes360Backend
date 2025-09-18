const Grade = require("../models/Grade");


const storeGrade = async (req, res) => {
    let { student_id, graded_by, score, remarks } = req.body;
    const grade = Grade.fill({ student_id, graded_by, score, remarks });
    await grade.insert();
    res.json({
        status: "success",
        message: "Grade added successfully",
        data: grade,
    });
};

const getGrades = async (req, res) => {
    const grades = await Grade.fetch();
    res.json({
        status: "success",
        message: "Grades fetched successfully",
        data: grades,
    });
};

const getGradeById = async (req, res) => {
    let { id } = req.params;
    const grade = await Grade.find(id);
    if (!grade) {
        return res.status(404).json({
            status: "error",
            message: "Grade not found",
        });
    }
    res.json({
        status: "success",
        message: "Grade fetched successfully",
        data: grade,
    });
};

const partialGradeUpdate = async (req, res) => {
    let { id } = req.params;
    const grade = await Grade.find(id);
    if (!grade) {
        return res.status(404).json({
            status: "error",
            message: "Grade not found",
        });
    }
    grade.fill(req.body);

    await grade.update();

    res.json({
        status: "success",
        message: "Grade updated successfully",
        data: grade,
    });
};

const deleteGrade = async (req, res) => {
    let { id } = req.params;
    const deleted = await Grade.delete(id);
    if (!deleted) {
        return res.status(404).json({
            status: "error",
            message: "Failed to delete grade",
        });
    }

    res.json({
        status: "success",
        message: "Grade deleted successfully",
    });
};

const getStudentGrades = async (req, res) => {
    let { studentId } = req.params;
    
    try {
        // Assuming you have a method to find grades by student_id
        const grades = await Grade.query('SELECT * FROM grades WHERE student_id = ?', [studentId]);
        
        res.json({
            status: "success",
            message: "Student grades fetched successfully",
            data: grades,
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Failed to fetch student grades: " + error.message,
        });
    }
};


module.exports = {
    storeGrade,
    getGrades,
    getGradeById,
    partialGradeUpdate,
    deleteGrade,
    getStudentGrades,  // Add this export
};
