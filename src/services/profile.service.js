// services/profileService.js
const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");
const { editProfileSchema } = require("../utils/Schemas/profile.schema");
const { deleteFromCloudinary } = require("../middlewares/upload");

// get a student's profile by their user ID
const getProfileByUserId = async (userId) => {
  const profile = await StudentProfile.findOne({ user_id: userId });

  if (!profile) {
    throw { status: 404, message: "Profile not found." };
  }

  return profile;
};

// edit a student's profile
async function editProfile(userId, body, files) {
  const profile = await StudentProfile.findOne({ user_id: userId });
  if (!profile) {
    throw { statusCode: 404, message: "Profile not found." };
  }

  const normalizedBody = {
    ...body,
    skills:
      body.skills === ""
        ? []
        : body.skills
          ? Array.isArray(body.skills)
            ? body.skills
            : [body.skills]
          : undefined,
  };

  const result = editProfileSchema.safeParse(normalizedBody);

  if (!result.success) {
    const errors = result.error.issues.map((e) => e.message);
    throw { statusCode: 422, errors };
  }

  const update = { ...result.data };

  // --- Normalize skills ---
  if (update.skills) {
    update.skills = [...new Set(update.skills.map((s) => s.trim()))];
  }

  if (!("links" in update)) {
    update.links = [];
  }

  // --- Username uniqueness check ---
  if (update.username) {
    const v = update.username.toLowerCase();

    const [takenInProfile, takenInUser] = await Promise.all([
      StudentProfile.findOne({ username: v, user_id: { $ne: userId } }),
      User.findOne({ username: v, _id: { $ne: userId } }),
    ]);

    if (takenInProfile || takenInUser) {
      throw {
        statusCode: 422,
        errors: ["Username is already taken."],
      };
    }

    update.username = v;
  }

  // ── Files ──────────────────────────────────────────────────────────────────
  const profilePic = files?.profile_picture?.[0];
  const cvFile = files?.cv?.[0];

  // --- CV ---
  if (cvFile) {
    await deleteFromCloudinary(profile.cv?.storagePath, "raw");
    update.cv = {
      filename: cvFile.originalname,
      storagePath: cvFile.path,
      uploadedAt: new Date(),
    };
  } else if (body.cv_cleared === "true") {
    await deleteFromCloudinary(profile.cv?.storagePath, "raw");
    update.cv = { filename: null, storagePath: null, uploadedAt: null };
  }

  // --- Profile Picture ---
  if (profilePic) {
    update.profile_picture = {
      filename: profilePic.originalname,
      storagePath: profilePic.path,
      uploadedAt: new Date(),
    };
  }

  // --- Nothing to update ---
  if (Object.keys(update).length === 0) return profile;

  // --- Persist ---
  const updated = await StudentProfile.findOneAndUpdate(
    { user_id: userId },
    { $set: update },
    { new: true },
  );

  // --- Sync shared fields to User ---
  const userSync = {};
  if (update.username) userSync.username = update.username;
  if (update.first_name) userSync.first_name = update.first_name;
  if (update.last_name) userSync.last_name = update.last_name;

  if (Object.keys(userSync).length) {
    await User.findByIdAndUpdate(userId, { $set: userSync });
  }

  return updated;
}

module.exports = { getProfileByUserId, editProfile };
