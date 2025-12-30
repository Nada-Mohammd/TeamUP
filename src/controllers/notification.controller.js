// controllers/notification.controller.js
const notificationService = require('../services/notification.service');

// GET api/notifications
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = await notificationService.getUserNotifications(userId);
    
    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { getUserNotifications };