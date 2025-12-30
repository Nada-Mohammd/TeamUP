// services/notification.service.js
const Notification = require('../models/Notification');

const getUserNotifications = async (userId) => {
  return await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .populate('userId', 'first_name last_name email');
};

module.exports = { getUserNotifications };