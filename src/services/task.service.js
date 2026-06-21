const Task = require("../models/Task");
const Team = require("../models/Team");
const TeamMember = require("../models/TeamMembers");
const Coursework = require("../models/Coursework");
const User = require("../models/User");
const path = require("path");
const notificationService = require("./notification.service");
const StudentProfile = require("../models/StudentProfile");
const Class = require("../models/Class");
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
    throw new Error("Only workspace members can create tasks.");
  }

  // Step 3: Validate required fields
  const { name, description, deadline, deliverable_type, assignee_id } =
    taskData;

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
    const assigneeMembership = await TeamMember.findOne({
      teamId,
      studentId: assignee_id,
    });

    if (!assigneeMembership) {
      throw new Error("Assignee must be a member of the team.");
    }
  }

  // Step 5: Get coursework
  const coursework = await Coursework.findById(team.courseworkId);

  if (!coursework) {
    throw new Error("Coursework not found.");
  }

  const projectDeadline = coursework.deadline;

  // Step 6: Validate task deadline
  if (new Date(deadline) > new Date(projectDeadline)) {
    throw new Error(
      `Task deadline cannot exceed the project deadline (${new Date(projectDeadline).toLocaleDateString()}).`,
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

const deleteTask = async (taskId, userId) => {
  // Step 1: Find task
  const task = await Task.findById(taskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  // Step 2: Verify creator
  if (task.creator_id.toString() !== userId.toString()) {
    throw new Error("Only the creator can delete this task.");
  }

  // Step 3: Delete task insights
  // await TaskInsight.deleteMany({
  //   taskId: task._id,
  // });

  // Step 4: Delete task
  await Task.findByIdAndDelete(taskId);

  return {
    message: "Task deleted successfully.",
  };
};

// const getTaskDetails = async (taskId) => {
//   const task = await Task.findById(taskId)
//     .populate({
//       path: "creator_id",
//       select: "first_name last_name email profile_picture",
//     })
//     .populate({
//       path: "assignee_id",
//       select: "first_name last_name email profile_picture",
//     })
//     .populate({
//       path: "team_id",
//       select: "name",
//     });

//   if (!task) {
//     throw new Error("Task not found.");
//   }

//   return {
//     id: task._id,

//     name: task.name,

//     description: task.description,

//     status: task.status,

//     deadline: task.deadline,

//     deliverableType: task.deliverable_type,

//     deliverableFileUrl: task.deliverable_file_url,

//     markedAsDoneAt: task.marked_as_done_at,

//     createdAt: task.createdAt,

//     updatedAt: task.updatedAt,

//     creator: task.creator_id
//       ? {
//           id: task.creator_id._id,
//           first_name: task.creator_id.first_name,
//           last_name: task.creator_id.last_name,
//           email: task.creator_id.email,
//           profile_picture: task.creator_id.profile_picture,
//         }
//       : null,

//     assignee: task.assignee_id
//       ? {
//           id: task.assignee_id._id,
//           first_name: task.assignee_id.first_name,
//           last_ame: task.assignee_id.last_name,
//           email: task.assignee_id.email,
//           profile_picture: task.assignee_id.profile_picture,
//         }
//       : null,

//     team: task.team_id
//       ? {
//           id: task.team_id._id,
//           name: task.team_id.name,
//         }
//       : null,
//   };
// };

const getTaskDetails = async (taskId) => {
  const task = await Task.findById(taskId)
    .populate({ path: "creator_id", select: "first_name last_name email" })
    .populate({ path: "assignee_id", select: "first_name last_name email" })
    .populate({ path: "team_id", select: "name" });

  if (!task) {
    throw new Error("Task not found.");
  }

  // Fetch StudentProfiles for the creator and assignee to get their profile pictures
  const userIdsToFetch = [];
  if (task.creator_id) userIdsToFetch.push(task.creator_id._id);
  if (task.assignee_id) userIdsToFetch.push(task.assignee_id._id);

  const profiles =
    userIdsToFetch.length > 0
      ? await StudentProfile.find({ user_id: { $in: userIdsToFetch } })
          .select("user_id profile_picture")
          .lean()
      : [];

  const profileMap = new Map(
    profiles.map((p) => [
      p.user_id.toString(),
      p.profile_picture?.storagePath || null,
    ]),
  );

  return {
    id: task._id,
    name: task.name,
    description: task.description,
    status: task.status,
    deadline: task.deadline,
    deliverableType: task.deliverable_type,
    deliverableFileUrl: task.deliverable_file_url,
    markedAsDoneAt: task.marked_as_done_at,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,

    creator: task.creator_id
      ? {
          id: task.creator_id._id,
          firstName: task.creator_id.first_name,
          lastName: task.creator_id.last_name,
          email: task.creator_id.email,
          profilePicture:
            profileMap.get(task.creator_id._id.toString()) || null,
        }
      : null,

    assignee: task.assignee_id
      ? {
          id: task.assignee_id._id,
          firstName: task.assignee_id.first_name,
          lastName: task.assignee_id.last_name,
          email: task.assignee_id.email,
          profilePicture:
            profileMap.get(task.assignee_id._id.toString()) || null,
        }
      : null,

    team: task.team_id
      ? {
          id: task.team_id._id,
          name: task.team_id.name,
        }
      : null,
  };
};

const uploadDeliverable = async (taskId, userId, file) => {
  const task = await Task.findById(taskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  // Only assignee can upload

  if (!task.assignee_id) {
    throw new Error("Task is not assigned.");
  }

  if (task.assignee_id.toString() !== userId.toString()) {
    throw new Error("Only the assignee can upload deliverables.");
  }

  if (!file) {
    throw new Error("Deliverable file is required.");
  }

  const uploadedExtension = path.extname(file.originalname).toLowerCase();

  const requiredExtension = task.deliverable_type.toLowerCase();

  if (uploadedExtension !== requiredExtension) {
    throw new Error(
      `Wrong file type. This task requires a ${requiredExtension} file.`,
    );
  }

  task.deliverable_file_url = file.path;

  await task.save();

  return task;
};

const updateTask = async (taskId, userId, updateData) => {
  const task = await Task.findById(taskId)
    .populate("creator_id", "first_name last_name")
    .populate("assignee_id", "first_name last_name");

  if (!task) {
    throw new Error("Task not found.");
  }

  const isCreator = task.creator_id._id.toString() === userId.toString();

  const isAssignee =
    task.assignee_id && task.assignee_id._id.toString() === userId.toString();

  if (!isCreator && !isAssignee) {
    throw new Error("Only the creator or assigned member can edit this task.");
  }

  const team = await Team.findById(task.team_id);

  if (!team) {
    throw new Error("Team not found.");
  }

  const coursework = await Coursework.findById(team.courseworkId);

  if (!coursework) {
    throw new Error("Coursework not found.");
  }

  const classObj = await Class.findById(coursework.classId);

  if (!classObj) {
    throw new Error("Class not found.");
  }

  /*
    Deadline validation
  */

  if (
    updateData.deadline &&
    new Date(updateData.deadline) > new Date(coursework.deadline)
  ) {
    throw new Error(
      `Task deadline cannot exceed the project deadline (${new Date(coursework.deadline).toLocaleDateString()}).`,
    );
  }

  /*
    Update editable fields only
  */

  task.name = updateData.name ?? task.name;

  task.description = updateData.description ?? task.description;

  task.deadline = updateData.deadline ?? task.deadline;

  task.deliverable_type = updateData.deliverable_type ?? task.deliverable_type;

  await task.save();

  /*
    Notification Rules
  */

  const actorName = isCreator
    ? `${task.creator_id.first_name} ${task.creator_id.last_name}`
    : `${task.assignee_id.first_name} ${task.assignee_id.last_name}`;

  const notificationMessage = `${classObj.course_code} | ${coursework.name}

${actorName} updated the task: ${task.name}`;

  /*
    Creator edited task
    Notify assignee
  */

  if (isCreator && task.assignee_id) {
    await notificationService.createNotification({
      userId: task.assignee_id._id,

      type: "TASK_UPDATED",

      message: notificationMessage,

      referenceId: task._id,

      courseCode: classObj.course_code,

      classColor: classObj.class_color,
    });
  }

  /*
    Assignee edited task
    Notify creator
  */

  if (isAssignee && task.creator_id) {
    await notificationService.createNotification({
      userId: task.creator_id._id,

      type: "TASK_UPDATED",

      message: notificationMessage,

      referenceId: task._id,

      courseCode: classObj.course_code,

      classColor: classObj.class_color,
    });
  }

  return task;
};

const getTeamTasks = async (teamId, page, limit, search) => {
  const team = await Team.findById(teamId);

  if (!team) {
    throw new Error("Team not found.");
  }

  const skip = (page - 1) * limit;

  const query = {
    team_id: teamId,
  };

  /*
    Search by:
    - Task name
    - Assignee first name
    - Assignee last name
  */

  if (search) {
    const matchingUsers = await User.find({
      $or: [
        {
          first_name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          last_name: {
            $regex: search,
            $options: "i",
          },
        },
      ],
    }).select("_id");

    const assigneeIds = matchingUsers.map((user) => user._id);

    query.$or = [
      {
        name: {
          $regex: search,
          $options: "i",
        },
      },
      {
        assignee_id: {
          $in: assigneeIds,
        },
      },
    ];
  }

  const total = await Task.countDocuments(query);

  const tasks = await Task.find(query)
  .populate({
    path: "assignee_id",
    select: "first_name last_name profile_id",
    populate: {
      path: "profile_id",
      select: "profile_picture",
    },
  })
  .sort({
    deadline: 1,
    createdAt: -1,
  })
  .skip(skip)
  .limit(limit);

  const formattedTasks = tasks.map((task) => ({
  id: task._id,

  task_name: task.name,

  assignee: task.assignee_id
    ? {
        id: task.assignee_id._id,

        name: `${task.assignee_id.first_name} ${task.assignee_id.last_name}`,

        profile_picture:
          task.assignee_id.profile_id?.profile_picture
            ?.storagePath || null,
      }
    : null,

  status: task.status,

  deadline: task.deadline,

  deliverable_url: task.deliverable_file_url,

  completed_at: task.marked_as_done_at,

  created_at: task.createdAt,
}));

  return {
    tasks: formattedTasks,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Helper to fetch Coursework name, Class Code, and Class Color for notifications
 */
const getNotificationContext = async (teamId) => {
  const team = await Team.findById(teamId).select("classId courseworkId");
  if (!team) {
    return {
      courseCode: null,
      classColor: null,
      courseworkName: "Unknown Coursework",
    };
  }

  const [classDoc, coursework] = await Promise.all([
    Class.findById(team.classId).select("class_code class_color"),
    Coursework.findById(team.courseworkId).select("name"),
  ]);

  return {
    courseCode: classDoc?.class_code || null,
    classColor: classDoc?.class_color || null,
    courseworkName: coursework ? coursework.name : "Unknown Coursework",
  };
};

/**
 * Assign a task to a member
 */
const assignTask = async (taskId, requesterId, assigneeId) => {
  const task = await Task.findById(taskId);
  if (!task) throw { statusCode: 404, message: "Task not found." };

  // Rule: Cannot assign if already assigned
  if (task.assignee_id) {
    throw {
      statusCode: 400,
      message: "Task is already assigned. Please unassign it first.",
    };
  }

  // Verify requester is in the team
  const requesterMembership = await TeamMember.findOne({
    teamId: task.team_id,
    studentId: requesterId,
  });
  if (!requesterMembership)
    throw { statusCode: 403, message: "You are not a member of this team." };

  // Verify assignee is in the team
  const assigneeMembership = await TeamMember.findOne({
    teamId: task.team_id,
    studentId: assigneeId,
  });
  if (!assigneeMembership)
    throw {
      statusCode: 400,
      message: "The selected assignee is not a member of this team.",
    };

  // Assign the task
  task.assignee_id = assigneeId;
  await task.save();

  // Send notification if assigning someone else
  if (requesterId.toString() !== assigneeId.toString()) {
    const [requester, assignee, context] = await Promise.all([
      User.findById(requesterId).select("first_name last_name"),
      User.findById(assigneeId).select("first_name last_name"),
      getNotificationContext(task.team_id),
    ]);

    const message = `${requester.first_name} ${requester.last_name} assigned you to the task '${task.name}' for '${context.courseworkName}' coursework.`;

    // ✅ ADDED courseCode and classColor to the notification payload
    await notificationService.createNotification({
      userId: assigneeId,
      type: "TASK_ASSIGNED",
      message,
      referenceId: task._id,
      courseCode: context.courseCode,
      classColor: context.classColor,
    });
  }

  return task;
};

/**
 * Unassign a task from its current assignee
 */
const unassignTask = async (taskId, requesterId) => {
  const task = await Task.findById(taskId);
  if (!task) throw { statusCode: 404, message: "Task not found." };

  if (!task.assignee_id) {
    throw {
      statusCode: 400,
      message: "Task is not currently assigned to anyone.",
    };
  }

  // Verify requester is in the team
  const requesterMembership = await TeamMember.findOne({
    teamId: task.team_id,
    studentId: requesterId,
  });
  if (!requesterMembership)
    throw { statusCode: 403, message: "You are not a member of this team." };

  // Permission check: Only creator or current assignee can unassign
  const isCreator = task.creator_id.toString() === requesterId.toString();
  const isAssignee = task.assignee_id.toString() === requesterId.toString();

  if (!isCreator && !isAssignee) {
    throw {
      statusCode: 403,
      message: "You do not have permission to unassign this task.",
    };
  }

  // Store old data for notification before clearing
  const oldAssigneeId = task.assignee_id;
  const creatorId = task.creator_id;

  // Unassign and reset task state
  task.assignee_id = null;
  task.status = "To Do";
  task.deliverable_file_url = null;
  task.marked_as_done_at = null;
  await task.save();

  // Notification logic
  if (isCreator && isAssignee) {
    // Same person, no notification needed
    return task;
  }

  const [creator, oldAssignee, context] = await Promise.all([
    User.findById(creatorId).select("first_name last_name"),
    User.findById(oldAssigneeId).select("first_name last_name"),
    getNotificationContext(task.team_id),
  ]);

  let message = "";
  let notifyUserId = null;

  if (isCreator) {
    // Creator unassigned the assignee -> Notify Assignee
    notifyUserId = oldAssigneeId;
    message = `${creator.first_name} ${creator.last_name} unassigned you from the task '${task.name}' for '${context.courseworkName}' coursework.`;
  } else if (isAssignee) {
    // Assignee unassigned themselves -> Notify Creator
    notifyUserId = creatorId;
    message = `${oldAssignee.first_name} ${oldAssignee.last_name} unassigned themselves from the task '${task.name}' for '${context.courseworkName}' coursework.`;
  }

  if (notifyUserId && message) {
    // ✅ ADDED courseCode and classColor to the notification payload
    await notificationService.createNotification({
      userId: notifyUserId,
      type: "TASK_UNASSIGNED",
      message,
      referenceId: task._id,
      courseCode: context.courseCode,
      classColor: context.classColor,
    });
  }

  return task;
};

/**
 * Update task status
 * - Strictly restricted to the assigned member
 * - Silent operation (no notifications)
 * - Automatically manages the marked_as_done_at timestamp
 */
const updateTaskStatus = async (taskId, requesterId, newStatus) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw { statusCode: 404, message: "Task not found." };
  }

  // Must be assigned to change status
  if (!task.assignee_id) {
    throw {
      statusCode: 400,
      message: "Cannot update status of an unassigned task.",
    };
  }

  // Strict permission: Only the current assignee can change status
  if (task.assignee_id.toString() !== requesterId.toString()) {
    throw {
      statusCode: 403,
      message: "Only the assigned member can update this task's status.",
    };
  }

  // Validate against Task model enum
  const allowedStatuses = ["To Do", "In Progress", "Done"];
  if (!allowedStatuses.includes(newStatus)) {
    throw {
      statusCode: 400,
      message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}.`,
    };
  }

  // Update status
  task.status = newStatus;

  // ✅ NEW: Manage the marked_as_done_at timestamp
  if (newStatus === "Done") {
    task.marked_as_done_at = new Date(); // Set to current time
  } else {
    task.marked_as_done_at = null; // Clear if reverted to To Do or In Progress
  }

  await task.save();

  return task;
};

module.exports = {
  createTask,
  getTaskDetails,
  uploadDeliverable,
  updateTask,
  getTeamTasks,
  deleteTask,
  assignTask,
  unassignTask,
  updateTaskStatus,
};
