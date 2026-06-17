const Team = require("../models/Team");
const TeamMember = require("../models/TeamMembers");
const Class = require("../models/Class");
const Coursework = require("../models/CourseWork");
const ClassProfile = require("../models/ClassProfile");
const User = require("../models/User");
const TeamJoinRequest = require("../models/TeamJoinRequest");
const Notification = require("../models/Notification");
const { onlineUsers, io } = require("../sockets/socket");
const StudentProfile = require("../models/StudentProfile");
const notificationService = require("./notification.service");
const mongoose = require("mongoose");

const createTeam = async (userId, teamData) => {
  const { name, courseworkId } = teamData;

  // Validate required fields
  if (!name?.trim()) {
    throw { message: "Team name is required.", statusCode: 400 };
  }

  if (!courseworkId) {
    throw { message: "Coursework ID is required.", statusCode: 400 };
  }

  // Validate student exists
  const student = await User.findById(userId);
  if (!student) {
    throw { message: "User not found.", statusCode: 404 };
  }

  // Validate role
  if (student.role !== "Student") {
    throw { message: "Only students can create teams.", statusCode: 403 };
  }

  // Validate coursework exists
  const coursework = await Coursework.findById(courseworkId);
  if (!coursework || coursework.isDeleted) {
    throw { message: "Coursework not found.", statusCode: 404 };
  }

  // Ensure student belongs to class
  const membership = await ClassProfile.findOne({
    classId: coursework.classId,
    userId: userId,
  });

  if (!membership) {
    throw { message: "You are not a member of this class.", statusCode: 403 };
  }

  // Prevent student from already being in a team for same coursework
  const existingTeam = await Team.findOne({
    courseworkId,
    leaderId: userId,
  });

  const existingMembership = await TeamMember.findOne({
    studentId: userId,
  }).populate({
    path: "teamId",
    match: { courseworkId },
  });

  if (existingTeam || (existingMembership && existingMembership.teamId)) {
    throw {
      message: "You are already part of a team for this coursework.",
      statusCode: 409,
    };
  }

  // Create Team
  const newTeam = await Team.create({
    name: name.trim(),
    courseworkId,
    classId: coursework.classId,
    instructorId: null,
    leaderId: userId,
    size: coursework.team_size_max,
  });

  // Insert creator into TeamMember as LEADER
  await TeamMember.create({
    teamId: newTeam._id,
    studentId: userId,
    role: "LEADER",
  });

  return newTeam;
};

//Lock Team
const lockTeam = async (teamId, userId) => {
  // Find team
  const team = await Team.findById(teamId);
  if (!team) {
    throw { message: "Team not found.", statusCode: 404 };
  }

  // Check if user is LEADER
  const leader = await TeamMember.findOne({
    teamId,
    studentId: userId,
    role: "LEADER",
  });
  if (!leader) {
    throw {
      message: "Only the team leader can lock the team.",
      statusCode: 403,
    };
  }

  // Get coursework to check minTeamSize
  const coursework = await Coursework.findById(team.courseworkId);
  if (!coursework) {
    throw { message: "Coursework not found.", statusCode: 404 };
  }

  // Count current team members
  const memberCount = await TeamMember.countDocuments({ teamId });

  if (memberCount < coursework.team_size_min) {
    throw {
      message: `Team must have at least ${coursework.team_size_min} members to be locked. Current members: ${memberCount}.`,
      statusCode: 400,
    };
  }

  team.isLocked = true;
  await team.save();

  return team;
};

const parseLockedQuery = (locked) => {
  if (locked === undefined) return false;
  if (typeof locked === "boolean") return locked;

  const normalized = String(locked).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;

  throw new Error('Invalid locked query value. Use "true" or "false".');
};

const getCourseworkTeams = async (classId, courseworkId, lockedQuery) => {
  const isLocked = parseLockedQuery(lockedQuery);

  const classDoc = await Class.findById(classId).select("course_name");
  if (!classDoc) {
    throw new Error("Class not found.");
  }

  const courseworkDoc =
    await Coursework.findById(courseworkId).select("name classId");
  if (!courseworkDoc) {
    throw new Error("Coursework not found.");
  }

  if (courseworkDoc.classId.toString() !== classId.toString()) {
    throw new Error("This coursework does not belong to the provided class.");
  }

  const teams = await Team.find({
    classId,
    courseworkId,
    isLocked,
  })
    .select("name")
    .sort({ createdAt: 1 });

  if (teams.length === 0) {
    return [];
  }

  const teamIds = teams.map((team) => team._id);

  const members = await TeamMember.find({ teamId: { $in: teamIds } })
    .populate({
      path: "studentId",
      select: "first_name last_name username email",
    })
    .select("teamId studentId role")
    .sort({ joinedAt: 1 });

  const membersByTeamId = new Map();

  members.forEach((memberDoc) => {
    if (!memberDoc.studentId) return;

    const key = memberDoc.teamId.toString();
    const member = {
      _id: memberDoc.studentId._id,
      first_name: memberDoc.studentId.first_name,
      last_name: memberDoc.studentId.last_name,
      username: memberDoc.studentId.username,
      email: memberDoc.studentId.email,
      role: memberDoc.role,
    };

    if (!membersByTeamId.has(key)) {
      membersByTeamId.set(key, [member]);
      return;
    }

    membersByTeamId.get(key).push(member);
  });

  const className = classDoc.course_name;
  const courseworkName = courseworkDoc.name;

  return teams.map((team) => ({
    teamId: team._id,
    teamName: team.name,
    teamMembers: membersByTeamId.get(team._id.toString()) || [],
    courseworkName,
    className,
  }));
};

const assignInstructorToTeam = async ({ teamId, leaderId, instructorId }) => {
  if (!instructorId) {
    throw { message: "Instructor ID is required.", statusCode: 400 };
  }

  const team = await Team.findById(teamId).select(
    "_id classId courseworkId instructorId",
  );
  if (!team) {
    throw { message: "Team not found.", statusCode: 404 };
  }

  const leaderMembership = await TeamMember.findOne({
    teamId,
    studentId: leaderId,
    role: "LEADER",
  });
  if (!leaderMembership) {
    throw {
      message: "Only the team leader can assign an instructor.",
      statusCode: 403,
    };
  }

  const coursework = await Coursework.findById(team.courseworkId).select(
    "classId isDeleted",
  );
  if (!coursework || coursework.isDeleted) {
    throw { message: "Coursework not found.", statusCode: 404 };
  }

  if (coursework.classId.toString() !== team.classId.toString()) {
    throw {
      message: "Team class does not match coursework class.",
      statusCode: 400,
    };
  }

  const instructor = await User.findById(instructorId).select(
    "first_name last_name role",
  );
  if (!instructor) {
    throw { message: "Instructor not found.", statusCode: 404 };
  }

  if (instructor.role !== "Instructor") {
    throw {
      message: "Selected user is not an instructor.",
      statusCode: 400,
    };
  }

  const instructorClassMembership = await ClassProfile.findOne({
    classId: team.classId,
    userId: instructorId,
  });
  if (!instructorClassMembership) {
    throw {
      message: "Selected instructor is not a member of this class.",
      statusCode: 400,
    };
  }

  // Atomic assignment: only succeeds if no instructor is assigned yet.
  const updatedTeam = await Team.findOneAndUpdate(
    {
      _id: teamId,
      instructorId: null,
    },
    {
      $set: { instructorId },
    },
    { new: true },
  )
    .populate("instructorId", "first_name last_name")
    .populate("courseworkId", "name")
    .populate({
      path: "classId",
      model: "Class",
      select: "course_name class_color class_code",
    });

  if (!updatedTeam) {
    throw {
      message: "An instructor is already assigned to this team.",
      statusCode: 409,
    };
  }

  return {
    teamId: updatedTeam._id,
    teamName: updatedTeam.name,
    instructor: updatedTeam.instructorId
      ? {
          id: updatedTeam.instructorId._id,
          name: `${updatedTeam.instructorId.first_name} ${updatedTeam.instructorId.last_name}`,
        }
      : null,
    courseworkName: updatedTeam.courseworkId?.name || null,
    className: updatedTeam.classId?.course_name || null,
    classColor: updatedTeam.classId?.class_color || "#FFFFFF",
    classCode: updatedTeam.classId?.class_code || null,
  };
};

const getTeamDetails = async (courseworkId, teamId) => {
  const team = await Team.findOne({
    _id: teamId,
    courseworkId: courseworkId,
  })
    .populate({
      path: "classId",
      model: "Class",
      select: "course_name class_color class_code",
    })
    .populate("courseworkId", "name")
    .populate("instructorId", "first_name last_name");

  if (!team) {
    throw { message: "Team not found", statusCode: 404 };
  }

  const members = await TeamMember.find({ teamId: team._id })
    .populate("studentId", "first_name last_name role")
    .select("studentId role -_id");

  const teamMembers = members.map((m) => ({
    id: m.studentId._id,
    name: `${m.studentId.first_name} ${m.studentId.last_name}`,
    role: m.role,
  }));

  return {
    teamName: team.name,
    instructor: team.instructorId
      ? `${team.instructorId.first_name} ${team.instructorId.last_name}`
      : null,
    teamMembers,
    courseworkName: team.courseworkId?.name || null,
    classId: team.classId?._id || null,
    className: team.classId?.course_name || null,
    classColor: team.classId?.class_color || "#FFFFFF",
    classCode: team.classId?.class_code || null,
    isLocked: team.isLocked,
  };
};

const getStudentTeams = async (studentId, courseCode) => {
  // Validate student exists
  const student = await User.findById(studentId);
  if (!student) {
    throw { message: "Student not found.", statusCode: 404 };
  }

  if (student.role !== "Student") {
    throw {
      message: "Only students can access this resource.",
      statusCode: 403,
    };
  }

  // Get all team memberships for this student
  const memberships = await TeamMember.find({ studentId }).populate({
    path: "teamId",
    populate: [
      {
        path: "classId",
        model: "Class",
        select: "course_code class_code class_color",
      },
      {
        path: "courseworkId",
        model: "Coursework",
        select: "name",
      },
    ],
  });

  if (!memberships.length) {
    return [];
  }

  const result = memberships
    .filter((m) => m.teamId) // safety
    .filter((m) => {
      if (!courseCode) return true;

      return (
        m.teamId.classId &&
        m.teamId.classId.course_code === courseCode.toUpperCase()
      );
    })
    .map((m) => ({
      teamId: m.teamId._id,
      courseworkId: m.teamId.courseworkId?._id || null,
      classId: m.teamId.classId?._id || null,

      courseCode: m.teamId.classId?.course_code || null,
      classCode: m.teamId.classId?.class_code || null,
      classColor: m.teamId.classId?.class_color || "#FFFFFF",

      teamName: m.teamId.name,
      courseworkName: m.teamId.courseworkId?.name || null,
    }));

  return result;
};

const getInstructorTeams = async (instructorId, courseCode) => {

  // Validate instructor exists
  const instructor = await User.findById(instructorId);

  if (!instructor) {
    throw { message: "Instructor not found.", statusCode: 404 };
  }

  console.log("Instructor role:", instructor.role);

  if (instructor.role !== "Instructor") {
    throw {
      message: "Only instructors can have access",
      statusCode: 403,
    };
  }

  // Get memberships
  const memberships = await Team.find({
    instructorId: instructorId,
  }).populate([
    {
      path: "classId",
      model: "Class",
      select: "course_code class_code class_color",
    },
    {
      path: "courseworkId",
      model: "Coursework",
      select: "name",
    },
  ]);

  if (!memberships.length) {
    return [];
  }

  const result = memberships
    .filter((m) => {
      const valid = !!m.classId;
      return valid;
    })
    .filter((m) => {
      if (!courseCode) return true;

      const match =
        m.classId && m.classId.course_code === courseCode.toUpperCase();

      return match;
    })
    .map((m) => ({
      teamId: m._id,
      courseworkId: m.courseworkId?._id || null,
      classId: m.classId?._id || null,

      courseCode: m.classId?.course_code || null,
      classCode: m.classId?.class_code || null,
      classColor: m.classId?.class_color || "#FFFFFF",

      teamName: m.name,
      courseworkName: m.courseworkId?.name || null,
    }));

  return result;
};

const ensureStudentEligibleForTeam = async ({
  studentId,
  team,
  coursework,
}) => {
  const student = await User.findById(studentId).select(
    "role first_name last_name",
  );
  if (!student || student.role !== "Student") {
    throw {
      message: "Only students are allowed in team invitation flows.",
      statusCode: 403,
    };
  }

  const classMembership = await ClassProfile.findOne({
    classId: team.classId,
    userId: studentId,
  });
  if (!classMembership) {
    throw {
      message: "Student is not a member of this class.",
      statusCode: 403,
    };
  }

  const teamMembership = await TeamMember.findOne({ studentId }).populate({
    path: "teamId",
    match: { courseworkId: team.courseworkId },
  });

  if (teamMembership && teamMembership.teamId) {
    throw {
      message: "Student is already in a team for this coursework.",
      statusCode: 409,
    };
  }

  const memberCount = await TeamMember.countDocuments({ teamId: team._id });
  if (memberCount >= coursework.team_size_max) {
    throw {
      message: "Team is full and cannot accept more members.",
      statusCode: 400,
    };
  }

  if (team.isLocked) {
    throw { message: "Team is locked.", statusCode: 400 };
  }

  return student;
};

const notifyUser = async ({ userId, type, message, referenceId = null }) => {
  const notification = await Notification.create({
    userId,
    type,
    message,
    referenceId,
    calendar_events: [],
  });

  const socketId = onlineUsers.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit("newNotification", notification);
  }

  return notification;
};

const notifyTeamMembers = async ({
  teamId,
  excludeUserIds = [],
  message,
  referenceId = null,
}) => {
  const members = await TeamMember.find({ teamId }).select("studentId");
  const excluded = new Set(excludeUserIds.map((id) => id.toString()));

  const notifications = members
    .map((member) => member.studentId)
    .filter((studentId) => !excluded.has(studentId.toString()))
    .map((studentId) => ({
      userId: studentId,
      type: "MESSAGE",
      message,
      referenceId,
      calendar_events: [],
    }));

  if (notifications.length === 0) {
    return;
  }

  const saved = await Notification.insertMany(notifications);

  saved.forEach((notification) => {
    const socketId = onlineUsers.get(notification.userId.toString());
    if (socketId) {
      io.to(socketId).emit("newNotification", notification);
    }
  });
};

const getTeamClassAndCourseworkNames = async ({ team, coursework }) => {
  const classDoc = await Class.findById(team.classId).select("course_name");

  return {
    teamName: team.name,
    className: classDoc?.course_name || "Unknown Class",
    courseworkName: coursework?.name || "Unknown Coursework",
  };
};

const buildInvitationFlowMessage = ({
  actorFullName,
  actionLine,
  teamName,
  className,
  courseworkName,
}) => {
  return `${actorFullName} ${actionLine} "${teamName}"\nClass: "${className}"\nCoursework: "${courseworkName}"`;
};

const autoLockTeamIfFull = async ({ teamId, leaderId, maxSize, isLocked }) => {
  if (isLocked) {
    return;
  }

  const currentCount = await TeamMember.countDocuments({ teamId });
  if (currentCount >= maxSize) {
    await lockTeam(teamId, leaderId);
  }
};

const sendJoinRequest = async ({ teamId, requesterId }) => {
  const team = await Team.findById(teamId);
  if (!team) {
    throw { message: "Team not found.", statusCode: 404 };
  }

  const coursework = await Coursework.findById(team.courseworkId);
  if (!coursework || coursework.isDeleted) {
    throw { message: "Coursework not found.", statusCode: 404 };
  }

  const leaderMembership = await TeamMember.findOne({
    teamId,
    role: "LEADER",
  }).select("studentId");
  if (!leaderMembership) {
    throw { message: "Team leader not found.", statusCode: 404 };
  }

  if (leaderMembership.studentId.toString() === requesterId.toString()) {
    throw {
      message: "Team leader cannot send join request to own team.",
      statusCode: 400,
    };
  }

  const requester = await ensureStudentEligibleForTeam({
    studentId: requesterId,
    team,
    coursework,
  });

  const { teamName, className, courseworkName } =
    await getTeamClassAndCourseworkNames({ team, coursework });

  const existingPending = await TeamJoinRequest.findOne({
    teamId,
    senderId: requesterId,
    receiverId: leaderMembership.studentId,
    flowType: "STUDENT_REQUEST",
    status: "PENDING",
  });

  if (existingPending) {
    throw {
      message: "A pending join request already exists.",
      statusCode: 409,
    };
  }

  const joinRequest = await TeamJoinRequest.create({
    teamId,
    senderId: requesterId,
    receiverId: leaderMembership.studentId,
    flowType: "STUDENT_REQUEST",
    status: "PENDING",
  });

  await notifyUser({
    userId: leaderMembership.studentId,
    type: "TEAM_JOIN_REQUEST",
    referenceId: joinRequest._id,
    message: buildInvitationFlowMessage({
      actorFullName: `${requester.first_name} ${requester.last_name}`,
      actionLine: "requested to join your team",
      teamName,
      className,
      courseworkName,
    }),
  });

  return joinRequest;
};

const respondToJoinRequest = async ({ requestId, leaderId, action }) => {
  const joinRequest = await TeamJoinRequest.findById(requestId);
  if (!joinRequest || joinRequest.flowType !== "STUDENT_REQUEST") {
    throw { message: "Join request not found.", statusCode: 404 };
  }

  if (joinRequest.status !== "PENDING") {
    throw {
      message: "This join request is no longer active.",
      statusCode: 400,
    };
  }

  if (joinRequest.receiverId.toString() !== leaderId.toString()) {
    throw {
      message: "Only the team leader can respond to this join request.",
      statusCode: 403,
    };
  }

  const team = await Team.findById(joinRequest.teamId);
  if (!team) {
    throw { message: "Team not found.", statusCode: 404 };
  }

  const coursework = await Coursework.findById(team.courseworkId);
  if (!coursework || coursework.isDeleted) {
    throw { message: "Coursework not found.", statusCode: 404 };
  }

  const { teamName, className, courseworkName } =
    await getTeamClassAndCourseworkNames({ team, coursework });
  const leader = await User.findById(leaderId).select("first_name last_name");
  const leaderFullName = leader
    ? `${leader.first_name} ${leader.last_name}`
    : "Team leader";

  if (action === "accept") {
    await ensureStudentEligibleForTeam({
      studentId: joinRequest.senderId,
      team,
      coursework,
    });

    await TeamMember.create({
      teamId: team._id,
      studentId: joinRequest.senderId,
      role: "MEMBER",
    });

    joinRequest.status = "ACCEPTED";
    await joinRequest.save();

    const acceptedStudent = await User.findById(joinRequest.senderId).select(
      "first_name last_name",
    );

    await notifyTeamMembers({
      teamId: team._id,
      excludeUserIds: [joinRequest.senderId],
      referenceId: joinRequest._id,
      message: buildInvitationFlowMessage({
        actorFullName: `${acceptedStudent.first_name} ${acceptedStudent.last_name}`,
        actionLine: "joined your team",
        teamName,
        className,
        courseworkName,
      }),
    });

    await notifyUser({
      userId: joinRequest.senderId,
      type: "TEAM_REQUEST_ACCEPTED",
      referenceId: joinRequest._id,
      message: buildInvitationFlowMessage({
        actorFullName: leaderFullName,
        actionLine: "accepted your request to join team",
        teamName,
        className,
        courseworkName,
      }),
    });

    await autoLockTeamIfFull({
      teamId: team._id,
      leaderId,
      maxSize: team.size,
      isLocked: team.isLocked,
    });

    return { success: true, status: "ACCEPTED" };
  }

  if (action !== "reject") {
    throw {
      message: 'Invalid action. Use "accept" or "reject".',
      statusCode: 400,
    };
  }

  joinRequest.status = "REJECTED";
  await joinRequest.save();

  await notifyUser({
    userId: joinRequest.senderId,
    type: "TEAM_REQUEST_REJECTED",
    referenceId: joinRequest._id,
    message: buildInvitationFlowMessage({
      actorFullName: leaderFullName,
      actionLine: "rejected your request to join team",
      teamName,
      className,
      courseworkName,
    }),
  });

  return { success: true, status: "REJECTED" };
};

const sendTeamInvitation = async ({ teamId, leaderId, studentId }) => {
  const team = await Team.findById(teamId);
  if (!team) {
    throw { message: "Team not found.", statusCode: 404 };
  }

  const leaderMembership = await TeamMember.findOne({
    teamId,
    studentId: leaderId,
    role: "LEADER",
  });

  if (!leaderMembership) {
    throw { message: "Only team leader can invite students.", statusCode: 403 };
  }

  if (leaderId.toString() === studentId.toString()) {
    throw { message: "Leader cannot invite themselves.", statusCode: 400 };
  }

  const coursework = await Coursework.findById(team.courseworkId);
  if (!coursework || coursework.isDeleted) {
    throw { message: "Coursework not found.", statusCode: 404 };
  }

  await ensureStudentEligibleForTeam({
    studentId,
    team,
    coursework,
  });

  const leader = await User.findById(leaderId).select("first_name last_name");
  const leaderFullName = leader
    ? `${leader.first_name} ${leader.last_name}`
    : "Team leader";

  const { teamName, className, courseworkName } =
    await getTeamClassAndCourseworkNames({ team, coursework });

  const existingPending = await TeamJoinRequest.findOne({
    teamId,
    senderId: leaderId,
    receiverId: studentId,
    flowType: "LEADER_INVITATION",
    status: "PENDING",
  });

  if (existingPending) {
    throw {
      message: "A pending invitation already exists for this student.",
      statusCode: 409,
    };
  }

  const invitation = await TeamJoinRequest.create({
    teamId,
    senderId: leaderId,
    receiverId: studentId,
    flowType: "LEADER_INVITATION",
    status: "PENDING",
  });

  await notifyUser({
    userId: studentId,
    type: "TEAM_INVITATION",
    referenceId: invitation._id,
    message: buildInvitationFlowMessage({
      actorFullName: leaderFullName,
      actionLine: "invited you to join team",
      teamName,
      className,
      courseworkName,
    }),
  });

  return invitation;
};

const respondToTeamInvitation = async ({ invitationId, studentId, action }) => {
  const invitation = await TeamJoinRequest.findById(invitationId);
  if (!invitation || invitation.flowType !== "LEADER_INVITATION") {
    throw { message: "Team invitation not found.", statusCode: 404 };
  }

  if (invitation.status !== "PENDING") {
    throw { message: "This invitation is no longer active.", statusCode: 400 };
  }

  if (invitation.receiverId.toString() !== studentId.toString()) {
    throw { message: "Only invited student can respond.", statusCode: 403 };
  }

  const team = await Team.findById(invitation.teamId);
  if (!team) {
    throw { message: "Team not found.", statusCode: 404 };
  }

  const coursework = await Coursework.findById(team.courseworkId);
  if (!coursework || coursework.isDeleted) {
    throw { message: "Coursework not found.", statusCode: 404 };
  }

  const { teamName, className, courseworkName } =
    await getTeamClassAndCourseworkNames({ team, coursework });

  if (action === "accept") {
    await ensureStudentEligibleForTeam({
      studentId: invitation.receiverId,
      team,
      coursework,
    });

    await TeamMember.create({
      teamId: team._id,
      studentId: invitation.receiverId,
      role: "MEMBER",
    });

    invitation.status = "ACCEPTED";
    await invitation.save();

    const acceptedStudent = await User.findById(invitation.receiverId).select(
      "first_name last_name",
    );
    const acceptedStudentFullName = acceptedStudent
      ? `${acceptedStudent.first_name} ${acceptedStudent.last_name}`
      : "A student";

    await notifyTeamMembers({
      teamId: team._id,
      excludeUserIds: [invitation.receiverId],
      referenceId: invitation._id,
      message: buildInvitationFlowMessage({
        actorFullName: acceptedStudentFullName,
        actionLine: "joined your team",
        teamName,
        className,
        courseworkName,
      }),
    });

    await notifyUser({
      userId: invitation.senderId,
      type: "INVITATION_STATUS",
      referenceId: invitation._id,
      message: buildInvitationFlowMessage({
        actorFullName: acceptedStudentFullName,
        actionLine: "accepted your invitation to join team",
        teamName,
        className,
        courseworkName,
      }),
    });

    await autoLockTeamIfFull({
      teamId: team._id,
      leaderId: invitation.senderId,
      maxSize: team.size,
      isLocked: team.isLocked,
    });

    return { success: true, status: "ACCEPTED" };
  }

  if (action !== "reject") {
    throw {
      message: 'Invalid action. Use "accept" or "reject".',
      statusCode: 400,
    };
  }

  invitation.status = "REJECTED";
  await invitation.save();

  const student = await User.findById(studentId).select("first_name last_name");
  const studentFullName = student
    ? `${student.first_name} ${student.last_name}`
    : "A student";

  await notifyUser({
    userId: invitation.senderId,
    type: "INVITATION_STATUS",
    referenceId: invitation._id,
    message: buildInvitationFlowMessage({
      actorFullName: studentFullName,
      actionLine: "declined your invitation to join team",
      teamName,
      className,
      courseworkName,
    }),
  });

  return { success: true, status: "REJECTED" };
};

const kickStudentFromTeam = async ({ teamId, studentId, instructorId }) => {
  //Check team exists
  const team = await Team.findById(teamId);
  if (!team) {
    const err = new Error("Team not found.");
    err.statusCode = 404;
    throw err;
  }

  //Check instructor is assigned to this team
  if (!team.instructorId || team.instructorId.toString() !== instructorId) {
    const err = new Error("You are not assigned as instructor for this team.");
    err.statusCode = 403;
    throw err;
  }

  //Get coursework
  const coursework = await Coursework.findById(team.courseworkId);
  if (!coursework) {
    const err = new Error("Coursework not found.");
    err.statusCode = 404;
    throw err;
  }

  //Check deadline (must be > 5 days)
  const deadline = new Date(coursework.deadline);
  const now = new Date();

  const diffTime = deadline - now;
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 5) {
    const err = new Error(
      "Cannot remove student when 5 days or less remain before deadline.",
    );
    err.statusCode = 400;
    throw err;
  }

  //Check student is in team
  const member = await TeamMember.findOne({
    teamId,
    studentId: studentId,
  });

  if (!member) {
    const err = new Error("Student is not in this team.");
    err.statusCode = 404;
    throw err;
  }

  // Check if the student being kicked is the leader
  const isLeader = member.role === "LEADER";

  if (isLeader) {
    // Find other members in the team BEFORE removing the leader
    const otherMembers = await TeamMember.find({
      teamId,
      studentId: { $ne: studentId }, // Exclude the student being kicked
    });

    if (otherMembers.length > 0) {
      // Randomly select a new leader
      const randomIndex = Math.floor(Math.random() * otherMembers.length);
      const newLeader = otherMembers[randomIndex];

      // Update the new leader's role
      await TeamMember.findByIdAndUpdate(
        newLeader._id,
        { $set: { role: "LEADER" } },
        { new: true },
      );

      // Get new leader info for notification
      const newLeaderUser = await User.findById(newLeader.studentId).select(
        "first_name last_name email",
      );

      // Get class info
      const classObj = await Class.findById(team.classId);

      // Get instructor info for notification
      const instructor = await User.findById(instructorId).select(
        "first_name last_name email",
      );

      // Notify the new leader
      await notificationService.createNotification({
        userId: newLeader.studentId,
        type: "TEAM_LEADER_ASSIGNED",
        message: `You have been assigned as the new leader of team "${team.name}" for the coursework "${coursework.name}".

The previous team leader has been removed by the instructor.

Instructor: ${instructor.first_name} ${instructor.last_name}
Email: ${instructor.email}

Please coordinate with your team members to ensure smooth progress.`,
        referenceId: team._id,
        courseCode: classObj?.course_code,
        classColor: classObj?.class_color,
      });
    } else {
      // No other members -> delete the team
      await Team.findByIdAndDelete(teamId);
    }
  }

  // Remove student from team
  await TeamMember.deleteOne({
    teamId,
    studentId: studentId,
  });

  // Get class info (for notification)
  const classObj = await Class.findById(team.classId);

  // Get instructor info
  const instructor = await User.findById(instructorId).select(
    "first_name last_name email",
  );

  const instructorName = `${instructor.first_name} ${instructor.last_name}`;

  // Send notification to kicked student
  await notificationService.createNotification({
    userId: studentId,
    type: "TEAM_MEMBER_REMOVED",
    message: `You have been removed from the team "${team.name}" for the coursework "${coursework.name}".

Instructor: ${instructorName}
Email: ${instructor.email}

If you believe this action was made in error, please contact your instructor.`,
    referenceId: team._id,
    courseCode: classObj?.course_code,
    classColor: classObj?.class_color,
  });

  return true;
};

const getTeamMembers = async (teamId) => {

  const team = await Team.findById(teamId);

  if (!team) {
    throw new Error("Team not found.");
  }

  const members = await TeamMember.find({
    teamId,
  })
    .populate(
      "studentId",
      "first_name last_name email"
    );

  const userIds = members.map(
    (member) => member.studentId._id
  );

  const profiles = await StudentProfile.find({
    user_id: { $in: userIds },
  });

  const profileMap = {};

  profiles.forEach((profile) => {
    profileMap[
      profile.user_id.toString()
    ] = profile;
  });

  const formattedMembers = members.map(
    (member) => {

      const profile =
        profileMap[
          member.studentId._id.toString()
        ];

      return {

        id: member._id,

        role: member.role,

        joined_at: member.joinedAt,

        student: {
          id: member.studentId._id,

          first_name:
            member.studentId.first_name,

          last_name:
            member.studentId.last_name,

          email:
            member.studentId.email,

          profile_picture:
            profile?.profile_picture
              ?.storagePath || null,
        },
      };
    }
  );

  formattedMembers.sort((a, b) => {

    if (a.role === "LEADER") {
      return -1;
    }

    if (b.role === "LEADER") {
      return 1;
    }

    return (
      new Date(a.joined_at) -
      new Date(b.joined_at)
    );
  });

  return formattedMembers;
};

module.exports = {
  createTeam,
  lockTeam,
  getCourseworkTeams,
  assignInstructorToTeam,
  getTeamDetails,
  getStudentTeams,
  getInstructorTeams,
  sendJoinRequest,
  respondToJoinRequest,
  sendTeamInvitation,
  respondToTeamInvitation,
  kickStudentFromTeam,
  getTeamMembers
};
