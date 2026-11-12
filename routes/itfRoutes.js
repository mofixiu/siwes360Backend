const { Router } = require("express");
const router = Router();

const { itfOverview, itfSchoolStudents } = require("../controllers/oversightController");
const allowRoles = require("../middlewares/allowRoles");

// Mounted behind verifyToken in app.js. ITF staff have read-only oversight of
// every institution.
router.use(allowRoles("itf"));
router.get("/overview", itfOverview);
router.get("/schools/:id/students", itfSchoolStudents);

module.exports = router;
