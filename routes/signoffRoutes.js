const { Router } = require("express");
const router = Router();

const { getStudentSignoffs, storeSignoff } = require("../controllers/signoffController");
const allowRoles = require("../middlewares/allowRoles");
const { studentViewer } = require("../middlewares/access");

// Mounted behind verifyToken in app.js. Anyone who may view the student reads
// their sign-offs; only the student's own supervisor signs (checked in the controller).
router.get("/student/:studentId", studentViewer("studentId"), getStudentSignoffs);
router.post("/", allowRoles("supervisor"), storeSignoff);

module.exports = router;
