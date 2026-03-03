// controllers/profileController.js
const profileService = require("../services/profile.service");

const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await profileService.getProfileByUserId(userId);
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

module.exports = { getProfile };