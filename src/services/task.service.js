const Task = require("../models/Task");
const Team = require("../models/Team");
const TeamMember = require("../models/TeamMembers");
const Coursework = require("../models/Coursework");

const createTask = async (userId, teamId, taskData) => {
  // Step 1: Find team
  const team = await Team.findById(teamId);

  if (!team) {
    throw new Error("Team not found.");
  }

  // Step 2: Verify creator belongs to team
  const membership = await TeamMember.findOne({
    teamId,
    studentId: userId,
  });

  if (!membership) {
    throw new Error(
      "Only workspace members can create tasks."
    );
  }

  // Step 3: Validate required fields
  const {
    name,
    description,
    deadline,
    deliverable_type,
    assignee_id,
  } = taskData;

  if (!name?.trim()) {
    throw new Error("Task name is required.");
  }

  if (!description?.trim()) {
    throw new Error("Task description is required.");
  }

  if (!deadline) {
    throw new Error("Task deadline is required.");
  }

  if (!deliverable_type) {
    throw new Error("Deliverable type is required.");
  }

  // Step 4: Validate assignee belongs to team
  if (assignee_id) {
    const assigneeMembership =
      await TeamMember.findOne({
        teamId,
        studentId: assignee_id,
      });

    if (!assigneeMembership) {
      throw new Error(
        "Assignee must be a member of the team."
      );
    }
  }

  // Step 5: Get coursework
  const coursework = await Coursework.findById(
    team.courseworkId
  );

  if (!coursework) {
    throw new Error("Coursework not found.");
  }

  const projectDeadline = coursework.deadline;

  // Step 6: Validate task deadline
  if (
    new Date(deadline) >
    new Date(projectDeadline)
  ) {
    throw new Error(
      `Task deadline cannot exceed the project deadline (${new Date(projectDeadline).toLocaleDateString()}).`
    );
  }

  // Step 7: Create task
  const task = await Task.create({
    team_id: teamId,

    creator_id: userId,

    assignee_id: assignee_id || null,

    name: name.trim(),

    description: description.trim(),

    deadline,

    deliverable_type,

    status: "To Do",
  });

  return task;
};

module.exports = {
  createTask,
};