const taskService = require("../services/task.service");

const createTask = async (req, res) => {
  try {

    const userId = req.user.id;

    const { teamId } = req.params;

    const task = await taskService.createTask(
      userId,
      teamId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Task created successfully.",
      data: task,
    });

  } catch (err) {

    return res.status(400).json({
      success: false,
      message: err.message,
    });

  }
};

module.exports = {
  createTask,
};