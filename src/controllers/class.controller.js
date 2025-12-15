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

module.exports = { createClass };