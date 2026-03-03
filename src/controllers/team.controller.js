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

module.exports = {
  createTeam,
  lockTeam,
  getCourseworkTeams,
  getTeamDetails,
  getStudentTeams
};
