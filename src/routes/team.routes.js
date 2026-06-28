const express = require("express");
const router = express.Router();

const teamController = require("../controllers/team.controller");
const { authenticate, authorize } = require("../middlewares/auth");
const {upload} = require("../middlewares/upload");

// POST /api/teams/create
router.post(
  "/create",
  authenticate,
  authorize("Student"),
  teamController.createTeam,
);

router.patch(
  "/:teamId/lock",
  authenticate,
  authorize("Student"),
  teamController.lockTeam,
);

router.patch(
  "/:teamId/assign-instructor",
  authenticate,
  authorize("Student"),
  teamController.assignInstructorToTeam,
);

// GET team details
router.get(
  "/courseworks/:courseworkId/teams/:teamId",
  authenticate,
  teamController.getTeamDetails,
);

// GET student's own teams
router.get(
  "/students/:studentId/teams",
  authenticate,
  authorize("Student"),
  teamController.getStudentTeams,
);

// GET instructor's own teams
router.get(
  "/instructors/:instructorId/teams",
  authenticate,
  authorize("Instructor"),
  teamController.getInstructorTeams,
);

router.patch(
  "/:teamId/lock",
  authenticate,
  authorize("Student"),
  teamController.lockTeam,
);

router.post(
  "/:teamId/join-requests",
  authenticate,
  authorize("Student"),
  teamController.sendJoinRequest,
);

router.patch(
  "/join-requests/:requestId/respond",
  authenticate,
  authorize("Student"),
  teamController.respondToJoinRequest,
);

router.post(
  "/:teamId/invitations",
  authenticate,
  authorize("Student"),
  teamController.sendTeamInvitation,
);

router.patch(
  "/invitations/:invitationId/respond",
  authenticate,
  authorize("Student"),
  teamController.respondToTeamInvitation,
);

router.delete(
  "/:teamId/members/:studentId/kick",
  authenticate,
  authorize("Instructor"),
  teamController.kickStudentFromTeam,
);

router.get("/:teamId/members", authenticate, teamController.getTeamMembers);

// GET /api/teams/:teamId/insights
router.get("/:teamId/insights", authenticate, teamController.getTeamInsights);

router.patch(
  "/:teamId/submit-coursework",
  authenticate,
  authorize("Student"),
  upload.single("file"),
  teamController.submitCoursework
);

router.get(
  "/:teamId/submission",
  authenticate,
  teamController.getTeamSubmission
);

module.exports = router;
