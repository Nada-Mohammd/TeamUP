// controllers/profileController.js
const profileService = require("../services/profile.service");

const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await profileService.getProfileByUserId(userId);
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
};
const updateProfileSkills = async (req, res) => {
  try {
    const { userId } = req.params;
    const { skills } = req.body;

    const profile = await profileService.updateProfileSkills(userId, skills);

    res.status(200).json({
      success: true,
      message: "Skills updated successfully",
      data: profile,
    });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
};

const editProfile = async (req, res) => {
  try {
    const updated = await profileService.editProfile(
      req.user._id,
      req.body,
      req.files,
    );
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updated,
    });
  } catch (err) {
    if (err.statusCode === 422) {
      return res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: err.errors || [err.message],
      });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: messages,
      });
    }
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to edit profile.",
    });
  }
};

module.exports = { getProfile, editProfile, updateProfileSkills };
