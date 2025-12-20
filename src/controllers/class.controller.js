const { get } = require('mongoose');
const Class = require('../models/Class');
const ClassProfile = require('../models/ClassProfile');

const classService = require('../services/class.service');

// GET api/classes/:userId
const getClasses = async (req, res) => {
  const userId = req.user.id;
  try {
    const classes = await classService.getClasses(userId);
    res.status(200).json({
      success: true,
      data: classes,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// POST api/classes/create
const createClass = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const classData = req.body;

    const newClass = await classService.createClass(instructorId, classData);

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: newClass,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /api/classes/:classId/class-code
const getClassCode = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;

    const classCode = await classService.getClassCode(classId, userId);

    res.status(200).json({ class_code: classCode });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
};

// GET /api/classes/:classId/search-users?username=dal
const searchUsers = async (req, res) => {
  try {
    const { classId } = req.params;
    const { username } = req.query;

    const users = await classService.searchUsers(
      classId,
      username
    );

    res.status(200).json({ success: true, data: users });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// const inviteUser = async (req, res) => {
//   try {
//     const { classId } = req.params;
//     const senderId = req.user.id;
//     const { userId, role } = req.body;

//     const invite = await classInviteService.inviteUser(
//       classId,
//       senderId,
//       userId,
//       role
//     );

//     res.status(201).json({
//       success: true,
//       message: 'Invitation sent',
//       data: invite,
//     });
//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message });
//   }
// };

module.exports = { getClasses, createClass, getClassCode, searchUsers };