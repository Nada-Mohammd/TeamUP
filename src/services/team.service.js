const Team = require("../models/Team");
const TeamMember = require("../models/TeamMembers");
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
    throw { message: "You are already part of a team for this coursework.", statusCode: 409 };
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
    throw { message: 'Team not found.', statusCode: 404 };
  }

  // Check if user is LEADER
  const leader = await TeamMember.findOne({
    teamId,
    studentId: userId,
    role: 'LEADER',
  });
  if (!leader) {
    throw { message: 'Only the team leader can lock the team.', statusCode: 403 };
  }

  // Get coursework to check minTeamSize
  const coursework = await Coursework.findById(team.courseworkId);
  if (!coursework) {
    throw { message: 'Coursework not found.', statusCode: 404 };
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

module.exports = {
  createTeam,
  lockTeam
};