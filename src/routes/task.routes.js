const express = require("express");

const router = express.Router();

const taskController = require("../controllers/task.controller");

const { authenticate, authorize } = require("../middlewares/auth");
const { upload } = require("../middlewares/upload");

router.post(
  "/teams/:teamId/tasks",
  authenticate,
  authorize("Student"),
  taskController.createTask,
);

router.delete(
  "/:taskId",
  authenticate,
  authorize("Student"),
  taskController.deleteTask,
);

router.get("/:taskId", authenticate, taskController.getTaskDetails);

router.patch(
  "/:taskId/deliverable",
  authenticate,
  authorize("Student"),
  upload.single("file"),
  taskController.uploadDeliverable,
);

router.put(
  "/:taskId",
  authenticate,
  authorize("Student"),
  taskController.updateTask,
);

router.get("/team/:teamId", authenticate, taskController.getTeamTasks);

// Assign task to a member
router.patch("/:taskId/assign", authenticate, taskController.assignTask);

// Unassign task from a member
router.patch("/:taskId/unassign", authenticate, taskController.unassignTask);

router.patch("/:taskId/status", authenticate, taskController.updateTaskStatus);

module.exports = router;
