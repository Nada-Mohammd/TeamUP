const Coursework = require("../models/CourseWork");
const User = require("../models/User");
const ClassProfile = require("../models/ClassProfile");
const notificationService = require("./notification.service");
const Post = require("../models/Post");

const createCoursework = async (instructorId, classId, data) => {
  const user = await User.findById(instructorId);
  if (!user || user.role !== "Instructor") {
    throw new Error("Only instructors can create coursework.");
  }

  if (!classId) {
    throw new Error("Class ID is required.");
  }

  const {
    name,
    description,
    notes,
    grade,
    team_size_min,
    team_size_max,
    deadline,
    discussion_date,
    include_discussion,
    grading_criteria,
    files,
  } = data;

  if (!name || !deadline) {
    throw new Error("Missing required fields: name and deadline.");
  }

  if (
    team_size_min != null &&
    team_size_max != null &&
    team_size_min > team_size_max
  ) {
    throw new Error("team_size_min cannot be greater than team_size_max.");
  }

  const coursework = await Coursework.create({
    name,
    description,
    notes,
    grade,
    team_size_min,
    team_size_max,
    deadline,
    discussion_date,
    include_discussion,
    grading_criteria,
    classId,
    authorId: instructorId,
    files: files || [],
  });

  // Create post
  await Post.create({
    type: "COURSEWORK",
    classId,
    authorId: instructorId,
    courseworkId: coursework._id,
  });

  // Notify students
  const classMembers = await ClassProfile.find({
    classId,
    classRole: "member",
  }).populate("userId", "role");

  const studentProfiles = classMembers.filter(
    profile => profile.userId?.role === "Student"
  );

  if (studentProfiles.length) {
    await notificationService.createBulkNotifications(
      studentProfiles.map(profile => ({
        userId: profile.userId._id,
        type: "COURSEWORK",
        message: `New coursework "${name}" has been added. Deadline: ${new Date(
          deadline
        ).toLocaleDateString()}`,
        referenceId: coursework._id,
      }))
    );
  }

  // Notify instructor
  await notificationService.createNotification({
    userId: instructorId,
    type: "COURSEWORK",
    message: `Your coursework "${name}" was created successfully.`,
    referenceId: coursework._id,
  });

  return coursework;
};

const getCourseworkById = async (courseworkId) => {
  const coursework = await Coursework.findById(courseworkId);

  if (!coursework || coursework.isDeleted) {
    const error = new Error("Coursework not found");
    error.statusCode = 404;
    throw error;
  }

  return coursework;
};

module.exports = {
  createCoursework,
  getCourseworkById
};
