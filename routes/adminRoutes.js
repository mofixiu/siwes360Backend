const { Router } = require("express");
const router = Router();

const { adminOverview, adminStudents, adminSupervisors } = require("../controllers/oversightController");
const allowRoles = require("../middlewares/allowRoles");

// Mounted behind verifyToken in app.js. A school admin (the institution's SIWES
// coordinator) sees only students whose school_id is their own school.
router.use(allowRoles("admin"));
router.get("/overview", adminOverview);
router.get("/students", adminStudents);
router.get("/supervisors", adminSupervisors);

module.exports = router;
