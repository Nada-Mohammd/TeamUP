const express = require("express");
const router = express.Router();

const aiTaskController = require("../controllers/aiTask.controller");
const { authenticate, authorize } = require("../middlewares/auth");

/**
 * Mounted in routes/index.js as:
 *   router.use("/ai-tasks", aiTaskRoutes);
 *
 * Full paths:
 *   POST /api/ai-tasks/teams/:teamId/generate-and-assign/preview
 *   POST /api/ai-tasks/teams/:teamId/generate-and-assign/regenerate
 *   POST /api/ai-tasks/teams/:teamId/generate-and-assign/confirm
 */

router.post(
  "/teams/:teamId/generate-and-assign/preview",
  authenticate,
  authorize("Student"),
  aiTaskController.preview,
);

router.post(
  "/teams/:teamId/generate-and-assign/regenerate",
  authenticate,
  authorize("Student"),
  aiTaskController.regenerate,
);

router.post(
  "/teams/:teamId/generate-and-assign/confirm",
  authenticate,
  authorize("Student"),
  aiTaskController.confirm,
);

module.exports = router;