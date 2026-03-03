// services/profileService.js
const StudentProfile = require("../models/StudentProfile");

const getProfileByUserId = async (userId) => {
  const profile = await StudentProfile.findOne({ user_id: userId });

  if (!profile) {
    throw { status: 404, message: "Profile not found." };
  }

  return profile;
};

module.exports = { getProfileByUserId };