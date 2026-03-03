const Team = require("../models/Team");
const TeamMember = require("../models/TeamMembers");
const Class = require("../models/Class");
const Coursework = require("../models/CourseWork");
const ClassProfile = require("../models/ClassProfile");
const User = require("../models/User");

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
  c;
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
    teamName: team.name,
    teamMembers: membersByTeamId.get(team._id.toString()) || [],
    courseworkName,
    className,
  }));
};

const getTeamDetails = async (courseworkId, teamId) => {
  const team = await Team.findOne({
    _id: teamId,
    courseworkId: courseworkId
  })
  .populate({
    path: "classId",        
    model: "Class",         
    select: "course_name class_color class_code"
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
    className: team.classId?.course_name || null,
    classColor: team.classId?.class_color || "#FFFFFF",
    classCode: team.classId?.class_code || null,
    isLocked: team.isLocked,
  };
};

const getStudentTeams = async (studentId, classCode) => {
  // Validate student exists
  const student = await User.findById(studentId);
  if (!student) {
    throw { message: "Student not found.", statusCode: 404 };
  }

  if (student.role !== "Student") {
    throw { message: "Only students can access this resource.", statusCode: 403 };
  }

  // Get all team memberships for this student
  const memberships = await TeamMember.find({ studentId })
    .populate({
      path: "teamId",
      populate: [
        {
          path: "classId",
          model: "Class",
          select: "class_code class_color",
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
      if (!classCode) return true;
      return (
        m.teamId.classId &&
        m.teamId.classId.class_code === classCode.toUpperCase()
      );
    })
    .map((m) => ({
      classCode: m.teamId.classId?.class_code || null,
      classColor: m.teamId.classId?.class_color || "#FFFFFF",
      teamName: m.teamId.name,
      courseworkName: m.teamId.courseworkId?.name || null,
    }));

  return result;
};

module.exports = {
  createTeam,
  lockTeam,
  getCourseworkTeams,
  getTeamDetails,
  getStudentTeams,
};
