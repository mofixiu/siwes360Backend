const { Router } = require("express");
const router = Router();

const {
  storeStudent,
  getStudents,
  getStudentById,
  partialStudentUpdate,
  deleteStudent,
  updateInternshipDates,
  searchSupervisors,
  getStudentDashboard,
} = require("../controllers/studentController");
const allowRoles = require("../middlewares/allowRoles");
const { studentViewer, adminStudentOwner, selfOrSchoolAdmin } = require("../middlewares/access");

// Mounted behind verifyToken in app.js. School admins only reach students of
// their own school; ITF reads every student.
router.get("/search/supervisors", allowRoles("student", "admin"), searchSupervisors);

router.post("/", allowRoles("admin"), storeStudent);
router.get("/", allowRoles("admin", "itf"), getStudents);
router.get("/:id", studentViewer("id"), getStudentById);
router.patch("/:id", allowRoles("admin"), adminStudentOwner("id"), partialStudentUpdate);
router.delete("/:id", allowRoles("admin"), adminStudentOwner("id"), deleteStudent);

router.patch("/:id/internship-dates", selfOrSchoolAdmin("id"), updateInternshipDates);
router.get("/:id/dashboard", studentViewer("id"), getStudentDashboard);

module.exports = router;
