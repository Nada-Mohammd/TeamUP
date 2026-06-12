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
  upload.single("file"),
  taskController.uploadDeliverable
);

module.exports = router;