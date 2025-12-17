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
        const { user_id } = req.params;

        const sql = `
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `;
        const notifications = await Notification.query(sql, [user_id]);

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
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            status: "error",
            message: "Failed to mark notification as read: " + error.message,
        });
    }
};

const markAllNotificationsAsRead = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const sql = `UPDATE notifications SET is_read = 1 WHERE user_id = ?`;
        await Notification.query(sql, [userId]);
        
        res.json({
            status: "success",
            message: "All notifications marked as read",
        });
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({
            status: "error",
            message: "Failed to mark all notifications as read: " + error.message,
        });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.delete(id);
        
        res.json({
            status: "success",
            message: "Notification deleted successfully",
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            status: "error",
            message: "Failed to delete notification: " + error.message,
        });
    }
};

const partialNotificationUpdate = async (req, res) => {
    let { id } = req.params;
    let updateData = req.body;
    
    const notification = await Notification.find(id);
    if (!notification) {
        return res.status(404).json({
            status: "error",
            message: "Notification not found",
        });
    }
    
    Object.assign(notification, updateData);
    await notification.update();
    
    res.json({
        status: "success",
        message: "Notification updated successfully",
        data: notification,
    });
};

module.exports = {
    storeNotification,
    getNotifications,
    getNotificationsByUser,
    getNotificationById,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    partialNotificationUpdate,
};
