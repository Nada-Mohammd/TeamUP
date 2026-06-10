const express = require("express");

const router = express.Router();

const taskController =
require("../controllers/task.controller");

const { authenticate, authorize } = require("../middlewares/auth");

router.post(
  "/teams/:teamId/tasks",
  authenticate,
  authorize("Student"),
  taskController.createTask
);

module.exports = router;