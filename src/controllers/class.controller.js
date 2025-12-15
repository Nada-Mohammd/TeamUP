const Class = require('../models/Class');
const ClassProfile = require('../models/ClassProfile');

const classService = require('../services/class.service');

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

module.exports = { createClass, getClassCode };