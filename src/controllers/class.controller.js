const { get } = require("mongoose");
const Class = require("../models/Class");
const ClassProfile = require("../models/ClassProfile");
const classService = require("../services/class.service");

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
      message: "Class created successfully",
      data: newClass,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// PATCH api/classes/edit/classId
const editClass = async (req, res) => {
  try {
    const classId = req.params.classId;
    const instructorId = req.user.id; // from authenticated session/token
    const updateData = req.body;

    const updatedClass = await classService.editClass(
      classId,
      instructorId,
      updateData
    );

    res.status(200).json({
      success: true,
      message: "Class updated successfully",
      data: updatedClass,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// DELETE api/classes/delete/:id
const deleteClass = async (req, res) => {
  try {
    const classId = req.params.classId;
    const instructorId = req.user.id;

    const deletedClass = await classService.deleteClass(classId, instructorId);

    res.status(200).json({
      success: true,
      message: `Class '${deletedClass.course_name}' has been deleted.`,
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

    const users = await classService.searchUsers(classId, username);

    res.status(200).json({ success: true, data: users });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/classes/join
const joinClassByCode = async (req, res) => {
  try {
    const { class_code } = req.body;
    const userId = req.user.id;

    const joinedClass = await classService.joinClassByCode(class_code, userId);

    res.status(200).json({
      success: true,
      message: `Welcome to ${joinedClass.course_name}!`,
      data: {
        classId: joinedClass._id,
        course_name: joinedClass.course_name,
        course_code: joinedClass.course_code,
      },
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/classes/:classId/invite
const inviteUser = async (req, res) => {
  try {
    const { classId } = req.params;
    const senderId = req.user.id;
    const { userId } = req.body;

    const invitation = await classService.createInvitation(
      { classId, senderId, receiverId: userId },
      req.io // pass io
    );

    res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: invitation,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PATCH /api/invitations/:invitationId
const respondToInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'
    const userId = req.user.id;

    if (action !== "accept" && action !== "decline") {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "accept" or "decline".',
      });
    }

    const result = await classService.respondToInvitation(
      invitationId,
      userId,
      action,
      req.io
    );

    if (action === "accept") {
      res.status(200).json({
        success: true,
        message: `You have joined ${result.className}!`,
        data: {
          classId: result.classId,
          course_name: result.className,
        },
      });
    } else {
      res.status(200).json({
        success: true,
        message: "Invitation declined.",
      });
    }
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /api/classes/:classId/members/count
const getClassMemberCount = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id; // for authz (optional)

    const memberCount = await classService.getClassMemberCount(classId);

    res.status(200).json({
      success: true,
      data: {
        classId,
        memberCount,
      },
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getClasses,
  createClass,
  editClass,
  deleteClass,
  getClassCode,
  searchUsers,
  inviteUser,
  joinClassByCode,
  respondToInvitation,
  getClassMemberCount,
};
