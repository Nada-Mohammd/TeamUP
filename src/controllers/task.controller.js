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

const deleteTask = async (req, res) => {

  try {

    const { taskId } = req.params;

    const userId = req.user.id;

    const result =
      await taskService.deleteTask(
        taskId,
        userId
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });

  } catch (err) {

    return res.status(400).json({
      success: false,
      message: err.message,
    });

  }

};

const getTaskDetails = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task =
      await taskService.getTaskDetails(
        taskId
      );

    return res.status(200).json({
      success: true,
      data: task,
    });

  } catch (err) {

    return res.status(404).json({
      success: false,
      message: err.message,
    });

  }
};

const uploadDeliverable = async (
  req,
  res
) => {

  try {

    const { taskId } = req.params;

    const userId = req.user.id;

    const task =
      await taskService.uploadDeliverable(
        taskId,
        userId,
        req.file
      );

    return res.status(200).json({
      success: true,
      message:
        "Deliverable uploaded successfully.",
      data: task,
    });

  } catch (err) {

    return res.status(400).json({
      success: false,
      message: err.message,
    });

  }

};

const updateTask = async (
  req,
  res
) => {

  try {

    const task =
      await taskService.updateTask(
        req.params.taskId,
        req.user.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        "Task updated successfully.",
      data: task,
    });

  } catch (error) {

    return res.status(400).json({
      success: false,
      message: error.message,
    });

  }

};

const getTeamTasks = async (req, res) => {
  try {

    const { teamId } = req.params;

    const page =
      Number(req.query.page) || 1;

    const limit =
      Number(req.query.limit) || 10;

    const search =
      req.query.search || "";

    const result =
      await taskService.getTeamTasks(
        teamId,
        page,
        limit,
        search
      );

    return res.status(200).json({
      success: true,
      message: "Tasks retrieved successfully.",
      data: result,
    });

  } catch (error) {

    return res.status(400).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = {
  createTask,
  deleteTask,
  getTaskDetails,
  uploadDeliverable,
  updateTask,
  getTeamTasks,
};