const express = require("express");
const router = express.Router();
const {
  getNotificationsByUser,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");
const { selfOrRoles, notificationOwner } = require("../middlewares/access");

// Mounted behind verifyToken in app.js. Notifications are private to their owner.
router.get("/user/:userId", selfOrRoles("userId"), getNotificationsByUser);
router.put("/user/:userId/read-all", selfOrRoles("userId"), markAllAsRead);
router.put("/:id/read", notificationOwner, markNotificationAsRead);
router.delete("/:id", notificationOwner, deleteNotification);

module.exports = router;
