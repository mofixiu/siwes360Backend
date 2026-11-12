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
  getSupervisorQueue,
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

// A supervisor can have students from several schools, so school admins use
// /api/admin/supervisors, which counts only their own school's students.
router.get("/:id/students", selfOrRoles("id", "itf"), getSupervisorStudents);
router.get("/:id/dashboard", selfOrRoles("id", "itf"), getSupervisorDashboard);
router.get("/:id/queue", selfOrRoles("id"), getSupervisorQueue);

module.exports = router;
