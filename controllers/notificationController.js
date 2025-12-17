const Notification = require("../models/Notification");

const storeNotification = async (req, res) => {
    let { user_id, message, is_read } = req.body;
    const notification = Notification.fill({ user_id, message, is_read });
    await notification.insert();
    res.json({
        status: "success",
        message: "Notification added successfully",
        data: notification,
    });
};

const getNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const sql = `
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `;
        
        const notifications = await Notification.query(sql, [userId]);
        
        res.json({
            status: "success",
            message: "Notifications fetched successfully",
            data: notifications,
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch notifications: " + error.message,
        });
    }
};

const getNotificationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const sql = `
      SELECT 
        n.*,
        DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM notifications n
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `;

    const notifications = await Notification.query(sql, [userId]);

    res.json({
      status: "success",
      message: "Notifications fetched successfully",
      data: notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch notifications: " + error.message,
    });
  }
};

const getNotificationById = async (req, res) => {
    let { id } = req.params;
    const notification = await Notification.find(id);
    if (!notification) {
        return res.status(404).json({
            status: "error",
            message: "Notification not found",
        });
    }
    res.json({
        status: "success",
        message: "Notification fetched successfully",
        data: notification,
    });
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `UPDATE notifications SET is_read = 1 WHERE id = ?`;
    await Notification.query(sql, [id]);

    res.json({
      status: "success",
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to mark notification as read: " + error.message,
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    const sql = `UPDATE notifications SET is_read = 1 WHERE user_id = ?`;
    await Notification.query(sql, [userId]);

    res.json({
      status: "success",
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to mark all notifications as read: " + error.message,
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Notification.delete(id);
    if (!deleted) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    res.json({
      status: "success",
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete notification: " + error.message,
    });
  }
};

// Helper function to create notifications
const createNotification = async (userId, message, type = 'general') => {
  try {
    console.log(`Creating notification for user ${userId}: ${message} (${type})`);
    
    const notification = Notification.fill({
      user_id: userId,
      message: message,
      type: type,
      is_read: false,
    });
    
    await notification.insert();
    console.log(`✅ Notification created successfully with ID: ${notification.id}`);
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return null;
  }
};

module.exports = {
    storeNotification,
    getNotifications,
    getNotificationsByUser,
    getNotificationById,
    markNotificationAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
};
