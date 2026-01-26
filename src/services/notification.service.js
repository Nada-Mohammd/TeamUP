// services/notification.service.js
const Notification = require('../models/Notification');

const getUserNotifications = async (userId) => {
  return await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .populate('userId', 'first_name last_name email');
};

const createNotification = async ({
  userId,
  type,
  message,
  referenceId = null,
  calendar_events = [],
}) => {
  return await Notification.create({
    userId,
    type,
    message,
    referenceId,
    calendar_events,
  });
};

// helper for many students
const createBulkNotifications = async (notifications) => {
  return await Notification.insertMany(notifications);
};

module.exports = { 
    getUserNotifications,
    createNotification,
    createBulkNotifications,
 };