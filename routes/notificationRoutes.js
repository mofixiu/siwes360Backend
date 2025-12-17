const { Router } = require("express");
const router = Router();

const {
    storeNotification,
    getNotifications,
    getNotificationById,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    partialNotificationUpdate,
} = require("../controllers/notificationController");

// Notifications
router.post("/", storeNotification);
router.get("/user/:userId", getNotifications);
router.get("/:id", getNotificationById);
router.put("/:id/read", markNotificationAsRead);
router.put("/user/:userId/read-all", markAllNotificationsAsRead);
router.delete("/:id", deleteNotification);
router.patch("/:id", partialNotificationUpdate);

module.exports = router;
