// services/profileService.js
const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");
const { editProfileSchema } = require("../utils/Schemas/profile.schema");
const { deleteFromCloudinary } = require("../middlewares/upload");
const { normalizeSkillsWithAI } = require("./skillNormalization.service");

// get a student's profile by their user ID
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

// edit a student's profile
async function editProfile(userId, body, files) {
  const profile = await StudentProfile.findOne({ user_id: userId }).lean();
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

  if (update.skills) {
    update.skills = [...new Set(update.skills.map((s) => s.trim()))];
  }

  if (!("links" in update)) {
    update.links = [];
  }

  const profilePic = files?.profile_picture?.[0];
  const cvFile = files?.cv?.[0];

  const tasks = [];

  if (update.username) {
    const v = update.username.toLowerCase();
    tasks.push(
      Promise.all([
        StudentProfile.exists({ username: v, user_id: { $ne: userId } }),
        User.exists({ username: v, _id: { $ne: userId } }),
      ]).then(([takenInProfile, takenInUser]) => {
        if (takenInProfile || takenInUser) {
          throw { statusCode: 422, errors: ["Username is already taken."] };
        }
        update.username = v;
      }),
    );
  }

  if (cvFile) {
    update.cv = {
      filename: cvFile.originalname,
      storagePath: cvFile.path,
      uploadedAt: new Date(),
    };
  } else if (body.cv_cleared === "true") {
    tasks.push(
      deleteFromCloudinary(profile.cv?.storagePath, "raw").then(() => {
        update.cv = { filename: null, storagePath: null, uploadedAt: null };
      }),
    );
  }

  if (profilePic) {
    tasks.push(
      deleteFromCloudinary(profile.profile_picture?.storagePath, "image").then(
        () => {
          update.profile_picture = {
            filename: profilePic.originalname,
            storagePath: profilePic.path,
            uploadedAt: new Date(),
          };
        },
      ),
    );
  }

  await Promise.all(tasks);

  if (Object.keys(update).length === 0) return profile;

  // persist + sync user in parallel
  const [updated] = await Promise.all([
    StudentProfile.findOneAndUpdate(
      { user_id: userId },
      { $set: update },
      { new: true },
    ),
    update.username || update.first_name || update.last_name
      ? User.updateOne(
          { _id: userId },
          {
            $set: {
              ...(update.username && { username: update.username }),
              ...(update.first_name && { first_name: update.first_name }),
              ...(update.last_name && { last_name: update.last_name }),
            },
          },
        )
      : Promise.resolve(),
  ]);

  return updated;
}

module.exports = { getProfileByUserId, editProfile, updateProfileSkills };
