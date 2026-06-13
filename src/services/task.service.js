const Task = require("../models/Task");
const Team = require("../models/Team");
const TeamMember = require("../models/TeamMembers");
const Coursework = require("../models/Coursework");
const User = require("../models/User");
const path = require("path");
const notificationService = require("./notification.service");
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


const deleteTask = async (taskId, userId) => {

  // Step 1: Find task
  const task = await Task.findById(taskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  // Step 2: Verify creator
  if (
    task.creator_id.toString() !==
    userId.toString()
  ) {
    throw new Error(
      "Only the creator can delete this task."
    );
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



const getTaskDetails = async (taskId) => {
  const task = await Task.findById(taskId)
    .populate({
      path: "creator_id",
      select: "firstName lastName email profilePicture",
    })
    .populate({
      path: "assignee_id",
      select: "firstName lastName email profilePicture",
    })
    .populate({
      path: "team_id",
      select: "name",
    });

  if (!task) {
    throw new Error("Task not found.");
  }

  return {
    id: task._id,

    name: task.name,

    description: task.description,

    status: task.status,

    deadline: task.deadline,

    deliverableType: task.deliverable_type,

    deliverableFileUrl:
      task.deliverable_file_url,

    markedAsDoneAt:
      task.marked_as_done_at,

    createdAt: task.createdAt,

    updatedAt: task.updatedAt,

    creator: task.creator_id
      ? {
          id: task.creator_id._id,
          firstName:
            task.creator_id.firstName,
          lastName:
            task.creator_id.lastName,
          email:
            task.creator_id.email,
          profilePicture:
            task.creator_id.profilePicture,
        }
      : null,

    assignee: task.assignee_id
      ? {
          id: task.assignee_id._id,
          firstName:
            task.assignee_id.firstName,
          lastName:
            task.assignee_id.lastName,
          email:
            task.assignee_id.email,
          profilePicture:
            task.assignee_id.profilePicture,
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

const uploadDeliverable = async (
  taskId,
  userId,
  file
) => {

  const task = await Task.findById(taskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  // Only assignee can upload

  if (!task.assignee_id) {
    throw new Error(
      "Task is not assigned."
    );
  }

  if (
    task.assignee_id.toString() !==
    userId.toString()
  ) {
    throw new Error(
      "Only the assignee can upload deliverables."
    );
  }

  if (!file) {
    throw new Error(
      "Deliverable file is required."
    );
  }

  const uploadedExtension =
    path.extname(file.originalname)
      .toLowerCase();

  const requiredExtension =
    task.deliverable_type.toLowerCase();

  if (
    uploadedExtension !== requiredExtension
  ) {
    throw new Error(
      `Wrong file type. This task requires a ${requiredExtension} file.`
    );
  }

  task.deliverable_file_url =
    file.path;

  await task.save();

  return task;
};

const updateTask = async (
  taskId,
  userId,
  updateData
) => {

  const task = await Task.findById(taskId)
    .populate(
      "creator_id",
      "first_name last_name"
    )
    .populate(
      "assignee_id",
      "first_name last_name"
    );

  if (!task) {
    throw new Error("Task not found.");
  }

  const isCreator =
    task.creator_id._id.toString() ===
    userId.toString();

  const isAssignee =
    task.assignee_id &&
    task.assignee_id._id.toString() ===
    userId.toString();

  if (!isCreator && !isAssignee) {
    throw new Error(
      "Only the creator or assigned member can edit this task."
    );
  }

  const team = await Team.findById(
    task.team_id
  );

  if (!team) {
    throw new Error("Team not found.");
  }

  const coursework =
    await Coursework.findById(
      team.courseworkId
    );

  if (!coursework) {
    throw new Error(
      "Coursework not found."
    );
  }

  const classObj = await Class.findById(
    coursework.classId
  );

  if (!classObj) {
    throw new Error(
      "Class not found."
    );
  }

  /*
    Deadline validation
  */

  if (
    updateData.deadline &&
    new Date(updateData.deadline) >
      new Date(coursework.deadline)
  ) {
    throw new Error(
      `Task deadline cannot exceed the project deadline (${new Date(coursework.deadline).toLocaleDateString()}).`
    );
  }

  /*
    Update editable fields only
  */

  task.name =
    updateData.name ?? task.name;

  task.description =
    updateData.description ??
    task.description;

  task.deadline =
    updateData.deadline ??
    task.deadline;

  task.deliverable_type =
    updateData.deliverable_type ??
    task.deliverable_type;

  await task.save();

  /*
    Notification Rules
  */

  const actorName = isCreator
    ? `${task.creator_id.first_name} ${task.creator_id.last_name}`
    : `${task.assignee_id.first_name} ${task.assignee_id.last_name}`;

  const notificationMessage =
`${classObj.course_code} | ${coursework.name}

${actorName} updated the task: ${task.name}`;

  /*
    Creator edited task
    Notify assignee
  */

  if (
    isCreator &&
    task.assignee_id
  ) {

    await notificationService.createNotification({
      userId:
        task.assignee_id._id,

      type: "TASK_UPDATED",

      message:
        notificationMessage,

      referenceId:
        task._id,

      courseCode:
        classObj.course_code,

      classColor:
        classObj.class_color,
    });
  }

  /*
    Assignee edited task
    Notify creator
  */

  if (
    isAssignee &&
    task.creator_id
  ) {

    await notificationService.createNotification({
      userId:
        task.creator_id._id,

      type: "TASK_UPDATED",

      message:
        notificationMessage,

      referenceId:
        task._id,

      courseCode:
        classObj.course_code,

      classColor:
        classObj.class_color,
    });
  }

  return task;
};


const getTeamTasks = async (
  teamId,
  page,
  limit,
  search
) => {

  const team = await Team.findById(teamId);

  if (!team) {
    throw new Error("Team not found.");
  }

  const skip =
    (page - 1) * limit;

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

    const matchingUsers =
      await User.find({
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

    const assigneeIds =
      matchingUsers.map(
        (user) => user._id
      );

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

  const total =
    await Task.countDocuments(query);

  const tasks = await Task.find(query)
    .populate(
      "assignee_id",
      "first_name last_name profile_picture"
    )
    .sort({
      deadline: 1,
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit);

  const formattedTasks =
    tasks.map((task) => ({

      id: task._id,

      task_name: task.name,

      assignee: task.assignee_id
        ? {
            id: task.assignee_id._id,

            name:
              `${task.assignee_id.first_name} ${task.assignee_id.last_name}`,

            profile_picture:
              task.assignee_id.profile_picture,
          }
        : null,

      status: task.status,

      deadline: task.deadline,

      deliverable_url:
        task.deliverable_file_url,

      completed_at:
        task.marked_as_done_at,
    }));

  return {

    tasks: formattedTasks,

    pagination: {
      page,
      limit,
      total,
      totalPages:
        Math.ceil(total / limit),
    },
  };
};


module.exports = {
  createTask,
  getTaskDetails,
   uploadDeliverable,
   updateTask,
   getTeamTasks,
  deleteTask
};