const express = require("express");
const router = express.Router();

const teamController = require("../controllers/team.controller");
const { authenticate, authorize } = require("../middlewares/auth");

// POST /api/teams/create
router.post(
  "/create",
  authenticate,
  authorize("Student"),
  teamController.createTeam
);

router.patch('/:teamId/lock', authenticate, authorize("Student"), teamController.lockTeam);

module.exports = router;