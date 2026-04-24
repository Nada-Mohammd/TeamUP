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

module.exports = { getProfile, updateProfileSkills };
