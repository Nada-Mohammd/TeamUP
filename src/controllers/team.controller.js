const teamService = require("../services/team.service");

// POST /api/teams/create
const createTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const teamData = req.body;

    const newTeam = await teamService.createTeam(userId, teamData);

    res.status(201).json({
      success: true,
      message: "Team created successfully.",
      data: newTeam,
    });
  } catch (err) {
    const status = err.statusCode || 500;

    res.status(status).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

// PATCH /api/teams/:teamId/lock
const lockTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    const updatedTeam = await teamService.lockTeam(teamId, userId);

    return res.status(200).json({
      success: true,
      message: "Team locked successfully.",
      team: updatedTeam,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

// PATCH /api/teams/:teamId/assign-instructor
const assignInstructorToTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const leaderId = req.user.id;
    const { instructorId } = req.body;

    const result = await teamService.assignInstructorToTeam({
      teamId,
      leaderId,
      instructorId,
    });

    return res.status(200).json({
      success: true,
      message: "Instructor assigned successfully.",
      data: result,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

// GET /api/classes/:classId/courseworks/:courseworkId/teams?locked=false
const getCourseworkTeams = async (req, res) => {
  try {
    const { classId, courseworkId } = req.params;
    const { locked } = req.query;

    const teams = await teamService.getCourseworkTeams(
      classId,
      courseworkId,
      locked,
    );

    res.status(200).json({
      success: true,
      data: teams,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/teams/:teamId/join-requests
const sendJoinRequest = async (req, res) => {
  try {
    const { teamId } = req.params;
    const requesterId = req.user.id;

    const request = await teamService.sendJoinRequest({ teamId, requesterId });

    return res.status(201).json({
      success: true,
      message: "Join request sent successfully.",
      data: request,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

// PATCH /api/teams/join-requests/:requestId/respond
const respondToJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const leaderId = req.user.id;
    const { action } = req.body;

    const result = await teamService.respondToJoinRequest({
      requestId,
      leaderId,
      action,
    });

    return res.status(200).json({
      success: true,
      message: `Join request ${result.status.toLowerCase()}.`,
      data: result,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

// POST /api/teams/:teamId/invitations
const sendTeamInvitation = async (req, res) => {
  try {
    const { teamId } = req.params;
    const leaderId = req.user.id;
    const { studentId } = req.body;

    const invitation = await teamService.sendTeamInvitation({
      teamId,
      leaderId,
      studentId,
    });

    return res.status(201).json({
      success: true,
      message: "Team invitation sent successfully.",
      data: invitation,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

// PATCH /api/teams/invitations/:invitationId/respond
const respondToTeamInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const studentId = req.user.id;
    const { action } = req.body;

    const result = await teamService.respondToTeamInvitation({
      invitationId,
      studentId,
      action,
    });

    return res.status(200).json({
      success: true,
      message: `Team invitation ${result.status.toLowerCase()}.`,
      data: result,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

// GET /api/courseworks/:courseworkId/teams/:teamId
const getTeamDetails = async (req, res) => {
  try {
    const { courseworkId, teamId } = req.params;

    const teamDetails = await teamService.getTeamDetails(courseworkId, teamId);

    return res.status(200).json({
      success: true,
      data: teamDetails,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

// GET /api/students/:studentId/teams
const getStudentTeams = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classCode } = req.query;

    // Security: student can only access his own teams
    if (req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own teams.",
      });
    }

    const teams = await teamService.getStudentTeams(studentId, classCode);

    return res.status(200).json({
      success: true,
      data: teams,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

const getInstructorTeams = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const { classCode } = req.query;

    // Security: instructor can only access his own teams
    if (req.user.id !== instructorId) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own teams.",
      });
    }

    const teams = await teamService.getInstructorTeams(instructorId, classCode);

    return res.status(200).json({
      success: true,
      data: teams,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};
// DELETE /api/teams/:teamId/members/:studentId/kick
const kickStudentFromTeam = async (req, res) => {
  try {
    const { teamId, studentId } = req.params;
    const instructorId = req.user.id;

    await teamService.kickStudentFromTeam({
      teamId,
      studentId,
      instructorId,
      io: req.io,
    });

    return res.status(200).json({
      success: true,
      message: "Student kicked from team successfully.",
    });
  } catch (err) {
    const status = err.statusCode || 400;

    return res.status(status).json({
      success: false,
      message: err.message,
    });
  }
};

const getTeamMembers = async (req, res) => {
  try {

    const { teamId } = req.params;

    const members =
      await teamService.getTeamMembers(
        teamId
      );

    return res.status(200).json({
      success: true,
      message:
        "Team members retrieved successfully.",
      data: members,
    });

  } catch (error) {

    return res.status(400).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = {
  createTeam,
  lockTeam,
  assignInstructorToTeam,
  getCourseworkTeams,
  sendJoinRequest,
  respondToJoinRequest,
  sendTeamInvitation,
  respondToTeamInvitation,
  getTeamDetails,
  getStudentTeams,
  getInstructorTeams,
  kickStudentFromTeam,
  getTeamMembers
};
