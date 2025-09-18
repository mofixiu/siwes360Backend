const { Router } = require("express");
const router = Router();

const { storeSupervisor, getSupervisors, getSupervisorById, partialSupervisorUpdate, deleteSupervisor } = require("../controllers/supervisorController");

// Supervisor CRUD routes
router.post("/", storeSupervisor);
router.get("/", getSupervisors);
router.get("/:id", getSupervisorById);
router.patch("/:id", partialSupervisorUpdate);
router.delete("/:id", deleteSupervisor);

module.exports = router;
