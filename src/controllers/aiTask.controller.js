const {
  previewGenerateAndAssign,
  regenerateGenerateAndAssign,
  confirmAndSaveTasks,
} = require("../services/aiTaskOrchestration.service");

/**
 * POST /api/ai-tasks/teams/:teamId/generate-and-assign/preview
 *
 * Runs generation + assignment fully in memory. Nothing is saved.
 * Returns the proposed tasks (with tempId, assignee, reasoning) for the
 * student to review on the frontend.
 */
async function preview(req, res) {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    const result = await previewGenerateAndAssign({ teamId, userId });

    return res.status(200).json({
      message: "Tasks generated. Review before confirming.",
      ...result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    console.error("preview generateAndAssign error:", error);
    return res.status(statusCode).json({
      message: error.message || "Failed to generate tasks.",
    });
  }
}

/**
 * POST /api/ai-tasks/teams/:teamId/generate-and-assign/regenerate
 *
 * Body: { tasks: [...] }  <- the tasks array from the /preview (or a prior
 * /regenerate) response that the student rejected.
 *
 * Runs generation + assignment again in memory, telling the LLM which
 * tasks were already shown so it produces a meaningfully different
 * breakdown instead of reworded duplicates. Nothing is saved.
 */
async function regenerate(req, res) {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    const { tasks, regenerationHint } = req.body;

    const result = await regenerateGenerateAndAssign({
      teamId,
      userId,
      previousTasks: tasks,
      regenerationHint,
    });

    return res.status(200).json({
      message: "Tasks regenerated. Review before confirming.",
      ...result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    console.error("regenerate generateAndAssign error:", error);
    return res.status(statusCode).json({
      message: error.message || "Failed to regenerate tasks.",
    });
  }
}

/**
 * POST /api/ai-tasks/teams/:teamId/generate-and-assign/confirm
 *
 * Body: { tasks: [...] }  <- the exact array returned by the /preview (or
 * /regenerate) endpoint above, sent back unmodified.
 *
 * Saves the tasks to the DB, resolving dependsOn references.
 */
async function confirm(req, res) {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    const { tasks } = req.body;

    const savedTasks = await confirmAndSaveTasks({ teamId, userId, tasks });

    return res.status(201).json({
      message: "Tasks created successfully.",
      tasks: savedTasks,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    console.error("confirm generateAndAssign error:", error);
    return res.status(statusCode).json({
      message: error.message || "Failed to create tasks.",
    });
  }
}

module.exports = {
  preview,
  regenerate,
  confirm,
};