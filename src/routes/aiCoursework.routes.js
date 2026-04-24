const express = require("express");
const multer = require("multer");
const {
  extractCourseworkSkills,
  suggestTeamMembersForNewTeam,
} = require("../controllers/aiCoursework.controller");

const router = express.Router();

const upload = multer({
  dest: "uploads/",
});

router.get("/suggest-team-members", suggestTeamMembersForNewTeam);

router.post(
  "/coursework/:courseworkId/extract-skills",
  upload.single("assignmentFile"),
  extractCourseworkSkills,
);

module.exports = router;
