const { Router } = require("express");
const router = Router();

const { storeGrade, getGrades, getStudentGrades, getGradeById, deleteGrade } = require("../controllers/gradeController");
const allowRoles = require("../middlewares/allowRoles");
const { studentViewer, gradeViewer } = require("../middlewares/access");

// Mounted behind verifyToken in app.js. Only school admins grade, and only
// students of their own school (checked in the controller).
router.post("/", allowRoles("admin"), storeGrade);
router.get("/", allowRoles("admin", "itf"), getGrades);
router.get("/student/:studentId", studentViewer("studentId"), getStudentGrades);
router.get("/:id", gradeViewer, getGradeById);
router.delete("/:id", allowRoles("admin"), deleteGrade);

module.exports = router;
