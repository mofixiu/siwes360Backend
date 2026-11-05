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
const { selfOrRoles, studentViewer } = require("../middlewares/access");

// Mounted behind verifyToken in app.js.
router.get("/search/supervisors", allowRoles("student", "admin"), searchSupervisors);

router.post("/", allowRoles("admin"), storeStudent);
router.get("/", allowRoles("admin", "itf"), getStudents);
router.get("/:id", studentViewer("id"), getStudentById);
router.patch("/:id", allowRoles("admin"), partialStudentUpdate);
router.delete("/:id", allowRoles("admin"), deleteStudent);

router.patch("/:id/internship-dates", selfOrRoles("id", "admin"), updateInternshipDates);
router.get("/:id/dashboard", studentViewer("id"), getStudentDashboard);

module.exports = router;
