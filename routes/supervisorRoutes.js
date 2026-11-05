const { Router } = require("express");
const router = Router();

const {
  storeSupervisor,
  getSupervisors,
  getSupervisorById,
  partialSupervisorUpdate,
  deleteSupervisor,
  getSupervisorStudents,
  getSupervisorDashboard,
} = require("../controllers/supervisorController");
const allowRoles = require("../middlewares/allowRoles");
const { selfOrRoles } = require("../middlewares/access");

// Mounted behind verifyToken in app.js.
router.post("/", allowRoles("admin"), storeSupervisor);
router.get("/", allowRoles("admin", "itf"), getSupervisors);
// A supervisor's name, organisation and contact details are already visible to
// every student through /students/search/supervisors, so any signed-in user may
// read one profile.
router.get("/:id", allowRoles("student", "supervisor", "admin", "itf"), getSupervisorById);
router.patch("/:id", selfOrRoles("id", "admin"), partialSupervisorUpdate);
router.delete("/:id", allowRoles("admin"), deleteSupervisor);

router.get("/:id/students", selfOrRoles("id", "admin", "itf"), getSupervisorStudents);
router.get("/:id/dashboard", selfOrRoles("id", "admin", "itf"), getSupervisorDashboard);

module.exports = router;
