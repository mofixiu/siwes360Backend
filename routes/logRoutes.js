const { Router } = require("express");
const router = Router();

const { storeDailylog, getDailylogs, getDailylogById, deleteDailylog } = require("../controllers/dailylogController.js");

// Student logs
router.post("/", storeDailylog);                       // student creates log
router.get("/", getDailylogs);                         // admin/itf fetch all logs
router.get("/:id", getDailylogById);

// Supervisor actions
  // router.put("/:id/approve", approveLog);
  // router.put("/:id/reject", rejectLog);

// Delete
router.delete("/:id", deleteDailylog);

module.exports = router;
