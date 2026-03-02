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
      message: 'Team locked successfully.',
      team: updatedTeam,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  }
};

module.exports = {
  createTeam,
  lockTeam,
};