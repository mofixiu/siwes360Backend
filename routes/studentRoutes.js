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
  getStudentDashboard 
} = require("../controllers/studentController");
const verifyToken = require("../middlewares/verifyToken");

// Student CRUD routes
router.post("/", storeStudent);
router.get("/", getStudents);
router.get("/:id", getStudentById);
router.patch("/:id", partialStudentUpdate);
router.delete("/:id", deleteStudent);

// Protected routes
router.patch("/:id/internship-dates", verifyToken, updateInternshipDates);
router.get("/:id/dashboard", verifyToken, getStudentDashboard);
router.get("/search/supervisors", verifyToken, searchSupervisors);

module.exports = router;
