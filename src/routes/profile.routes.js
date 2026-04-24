// routes/profile.routes.js
const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfileSkills,
} = require("../controllers/profile.controller");
const { authenticate } = require("../middlewares/auth");
const authorizeProfileAccess = require("../middlewares/profile");

// GET /api/profile/:userId
router.get("/:userId", authenticate, authorizeProfileAccess, getProfile);
router.patch("/:userId/skills", updateProfileSkills);
module.exports = router;
