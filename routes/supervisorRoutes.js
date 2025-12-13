const { Router } = require("express");
const router = Router();

const { 
  storeSupervisor, 
  getSupervisors, 
  getSupervisorById, 
  partialSupervisorUpdate, 
  deleteSupervisor,
  getSupervisorStudents,
  getSupervisorDashboard 
} = require("../controllers/supervisorController");
const verifyToken = require("../middlewares/verifyToken");

// Supervisor CRUD routes
router.post("/", storeSupervisor);
router.get("/", getSupervisors);
router.get("/:id", getSupervisorById);
router.patch("/:id", partialSupervisorUpdate);
router.delete("/:id", deleteSupervisor);

// Protected routes
router.get("/:id/students", verifyToken, getSupervisorStudents);
router.get("/:id/dashboard", verifyToken, getSupervisorDashboard);

module.exports = router;
