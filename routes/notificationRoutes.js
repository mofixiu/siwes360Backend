const { Router } = require("express");
const router = Router();

const { storeNotification, getNotifications, deleteNotification } = require("../controllers/notificationController");

// Notifications
router.post("/", storeNotification);
router.get("/user/:userId", getNotifications);
// router.put("/:id/read", markNotificationRead);
router.delete("/:id", deleteNotification);

module.exports = router;
