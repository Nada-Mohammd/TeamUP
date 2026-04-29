const express = require("express");
const multer = require("multer");
const {
  extractCourseworkSkills,
  suggestTeamMembersForNewTeam,
} = require("../controllers/aiCoursework.controller");
const { authenticate, authorize } = require("../middlewares/auth");


const router = express.Router();

const upload = multer({
  dest: "uploads/",
});

router.get("/suggest-team-members",
  authenticate,
  authorize("Student"),
  suggestTeamMembersForNewTeam);

router.post(
  "/coursework/:courseworkId/extract-skills",
  authenticate,
  authorize("Student"),
  upload.single("assignmentFile"),
  extractCourseworkSkills,
);

module.exports = router;
