const { Router } = require("express");
const router = Router();

const { storeStudent, getStudents, getStudentById, partialStudentUpdate, deleteStudent } = require("../controllers/studentController");

// Student CRUD routes
router.post("/", storeStudent);
router.get("/", getStudents);
router.get("/:id", getStudentById);
router.patch("/:id", partialStudentUpdate);
router.delete("/:id", deleteStudent);

module.exports = router;
