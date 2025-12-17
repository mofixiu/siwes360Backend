const express = require("express");
const router = express.Router();
const {
  getNotificationsByUser,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification, // Add this
} = require("../controllers/notificationController");

// Get all notifications for a user
router.get("/user/:userId", getNotificationsByUser);

// Mark single notification as read
router.put("/:id/read", markNotificationAsRead);

// Mark all notifications as read for a user
router.put("/user/:userId/read-all", markAllAsRead);

// Delete a notification
router.delete("/:id", deleteNotification);



module.exports = router;
