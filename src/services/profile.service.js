// services/profileService.js
const StudentProfile = require("../models/StudentProfile");
const { normalizeSkillsWithAI } = require("./skillNormalization.service");

const getProfileByUserId = async (userId) => {
  const profile = await StudentProfile.findOne({ user_id: userId });

  if (!profile) {
    throw { status: 404, message: "Profile not found." };
  }

  return profile;
};
async function updateProfileSkills(userId, skills) {
  if (!Array.isArray(skills)) {
    const error = new Error("skills must be an array");
    error.status = 400;
    throw error;
  }

  const normalizedSkills = await normalizeSkillsWithAI(skills);

  const profile = await StudentProfile.findOneAndUpdate(
    { user_id: userId },
    { skills: normalizedSkills },
    { new: true, runValidators: true },
  );

  if (!profile) {
    const error = new Error("Profile not found");
    error.status = 404;
    throw error;
  }

  return profile;
}

module.exports = { getProfileByUserId, updateProfileSkills };
