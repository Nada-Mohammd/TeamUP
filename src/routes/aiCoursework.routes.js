const express = require("express");
const multer = require("multer");

const {
  extractCourseworkSkills,
} = require("../controllers/aiCoursework.controller");

const router = express.Router();

const upload = multer({
  dest: "uploads/",
});

router.get("/test", (req, res) => {
  res.json({ message: "AI coursework route is working" });
});

router.post(
  "/coursework/:courseworkId/extract-skills",
  upload.single("assignmentFile"),
  extractCourseworkSkills,
);

module.exports = router;
