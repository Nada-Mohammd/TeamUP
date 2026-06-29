// services/profileService.js
const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");
const { editProfileSchema } = require("../utils/Schemas/profile.schema");
const { deleteFromCloudinary } = require("../middlewares/upload");
const { normalizeSkills } = require("../services/matching.service");

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
    update.skills = [
      ...new Set(
        update.skills.map((s) => {
          const lowered = s.toLowerCase().trim();
          return lowered !== s ? normalizeSkills([s])[0] : s;
        }),
      ),
    ];
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
    update.profile_picture = {
      filename: profilePic.originalname,
      storagePath: profilePic.path,
      uploadedAt: new Date(),
    };
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

const getStudentRatings = async (userId) => {
  const profile = await StudentProfile.findOne({
    user_id: userId,
  }).populate({
    path: "ratings.raterId",
    select: "first_name last_name",
  });

  if (!profile) {
    throw {
      statusCode: 404,
      message: "Profile not found.",
    };
  }

  // No ratings yet
  if (!profile.ratings || profile.ratings.length === 0) {
    return {
      totalRatings: 0,
      ratings: [],
    };
  }

  const raterIds = profile.ratings
    .filter((r) => r.raterId)
    .map((r) => r.raterId._id.toString());

  const raterProfiles = await StudentProfile.find({
    user_id: { $in: raterIds },
  })
    .select("user_id profile_picture")
    .lean();

  const pictureMap = new Map(
    raterProfiles.map((p) => [
      p.user_id.toString(),
      p.profile_picture?.storagePath || null,
    ])
  );

  const ratings = profile.ratings
    .sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    )
    .map((rating) => ({
      id: rating._id,

      rater: rating.raterId
        ? {
            id: rating.raterId._id,
            firstName:
              rating.raterId.first_name,
            lastName:
              rating.raterId.last_name,
            profilePicture:
              pictureMap.get(
                rating.raterId._id.toString()
              ) || null,
          }
        : null,

      stars: rating.stars,
      comment: rating.comment,
      createdAt: rating.createdAt,
    }));

  return {
    totalRatings: ratings.length,
    ratings,
  };
};

module.exports = { getProfileByUserId, editProfile, getStudentRatings };
