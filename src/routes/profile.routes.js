// routes/profile.routes.js
const express = require("express");
const router = express.Router();
const { getProfile, editProfile } = require("../controllers/profile.controller");
const {authenticate} = require("../middlewares/auth");
const authorizeProfileAccess = require("../middlewares/profile");
const { uploadProfileFiles } = require("../middlewares/upload");

// GET /api/profile/:userId
router.get("/:userId", authenticate, authorizeProfileAccess, getProfile);

// PATCH /api/profile/:userId/edit
router.patch("/:userId/edit", authenticate, authorizeProfileAccess, uploadProfileFiles, editProfile);

module.exports = router;