const { Router } = require("express");
const router = Router();

const { storeGrade, getGrades, getStudentGrades, getGradeById, deleteGrade } = require("../controllers/gradeController");

// Admin grading
router.post("/", storeGrade);
router.get("/", getGrades);
router.get("/student/:studentId", getStudentGrades);  // Now this will work
router.get("/:id", getGradeById);
router.delete("/:id", deleteGrade);

module.exports = router;
