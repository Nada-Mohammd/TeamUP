const express = require("express");

const router = express.Router();

const taskController =
require("../controllers/task.controller");

const { authenticate, authorize } = require("../middlewares/auth");
const {upload} = require("../middlewares/upload");

router.post(
  "/teams/:teamId/tasks",
  authenticate,
  authorize("Student"),
  taskController.createTask
);

router.delete(
  "/:taskId",
  authenticate,
  authorize("Student"),
  taskController.deleteTask
);

router.get(
  "/:taskId",
  authenticate,
  taskController.getTaskDetails
);

router.patch(
  "/:taskId/deliverable",
  authenticate,
  authorize("Student"),
  upload.single("file"),
  taskController.uploadDeliverable
);

router.put(
  "/:taskId",
  authenticate,
  authorize("Student"),
  taskController.updateTask
);

router.get(
  "/team/:teamId",
  authenticate,
  taskController.getTeamTasks
);

module.exports = router;