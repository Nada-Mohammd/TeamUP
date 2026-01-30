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
    (profile) => profile.userId?.role === "Student",
  );

  if (studentProfiles.length) {
    await notificationService.createBulkNotifications(
      studentProfiles.map((profile) => ({
        userId: profile.userId._id,
        type: "COURSEWORK",
        message: `New coursework "${name}" has been added. Deadline: ${new Date(
          deadline,
        ).toLocaleDateString()}`,
        referenceId: coursework._id,
      })),
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

const updateCoursework = async (
  courseworkId,
  instructorId,
  updateData,
  newFiles = [],
) => {
  // 1. Fetch coursework
  const coursework = await Coursework.findById(courseworkId);
  if (!coursework || coursework.isDeleted) {
    throw new Error("Coursework not found or has been deleted.");
  }

  // 2. Validate instructor role
  const user = await User.findById(instructorId);
  if (!user || user.role !== "Instructor") {
    throw new Error("Only instructors can update coursework.");
  }

  // 3. Verify instructor is admin of the class
  const isAdmin = await ClassProfile.findOne({
    classId: coursework.classId,
    userId: instructorId,
    classRole: "admin",
  });
  if (!isAdmin) {
    throw new Error("Only class admins can update this coursework.");
  }

  // 4. Validate team sizes
  if (
    updateData.team_size_min != null &&
    updateData.team_size_max != null &&
    updateData.team_size_min > updateData.team_size_max
  ) {
    throw new Error("team_size_min cannot be greater than team_size_max.");
  }

  // 5. Merge new files with existing ones
  const combinedFiles = [...(coursework.files || []), ...newFiles];

  // 6. Update coursework
  const updatedCoursework = await Coursework.findByIdAndUpdate(
    courseworkId,
    {
      ...updateData,
      files: combinedFiles,
    },
    { new: true, runValidators: true },
  );

  // 7. Ensure an active Post exists for this coursework
  let post = await Post.findOne({ courseworkId });

  if (post) {
    // If post exists but was soft-deleted, restore it
    if (post.isDeleted) {
      post.isDeleted = false;
      await post.save();
    } else {
      await post.save();
    }
  } else {
    // If no post exists, create a new one
    await Post.create({
      type: "COURSEWORK",
      classId: coursework.classId,
      authorId: instructorId,
      courseworkId: courseworkId,
      isDeleted: false,
    });
  }

  // /. Notify students in class
  const studentProfiles = await ClassProfile.find({
    classId: coursework.classId,
    classRole: "member",
  }).populate("userId", "role");

  const studentIds = studentProfiles
    .filter((profile) => profile.userId?.role === "Student")
    .map((profile) => profile.userId._id);

  if (studentIds.length > 0) {
    await notificationService.createBulkNotifications(
      studentIds.map((userId) => ({
        userId,
        type: "COURSEWORK",
        message: `Coursework "${updateData.name}" has been updated. New deadline: ${new Date(updateData.deadline).toLocaleDateString()}`,
        referenceId: courseworkId,
      })),
    );
  }

  // 9. Notify instructor
  await notificationService.createNotification({
    userId: instructorId,
    type: "COURSEWORK",
    message: `Your coursework "${updateData.name}" was updated successfully.`,
    referenceId: courseworkId,
  });

  return updatedCoursework;
};

const deleteCoursework = async (courseworkId, instructorId) => {
  // 1. Fetch coursework
  const coursework = await Coursework.findById(courseworkId);
  if (!coursework || coursework.isDeleted) {
    throw new Error("Coursework not found.");
  }

  // 2. Validate instructor role
  const user = await User.findById(instructorId);
  if (!user || user.role !== "Instructor") {
    throw new Error("Only instructors can delete coursework.");
  }

  // 3. Verify instructor is admin of the class
  const isAdmin = await ClassProfile.findOne({
    classId: coursework.classId,
    userId: instructorId,
    classRole: "admin",
  });
  if (!isAdmin) {
    throw new Error("Only class admins can delete this coursework.");
  }

  // 4. Soft-delete coursework
  await Coursework.findByIdAndUpdate(courseworkId, { isDeleted: true });

  // 5. Soft-delete associated Post
  await Post.findOneAndUpdate({ courseworkId }, { isDeleted: true });

  // 6. Notify all students in class
  const studentProfiles = await ClassProfile.find({
    classId: coursework.classId,
    classRole: "member",
  }).populate("userId", "role");

  const studentIds = studentProfiles
    .filter((profile) => profile.userId?.role === "Student")
    .map((profile) => profile.userId._id);

  if (studentIds.length > 0) {
    await notificationService.createBulkNotifications(
      studentIds.map((userId) => ({
        userId,
        type: "COURSEWORK",
        message: `Coursework "${coursework.name}" has been removed by the instructor.`,
        referenceId: courseworkId,
      })),
    );
  }

  // 7. Notify instructor
  await notificationService.createNotification({
    userId: instructorId,
    type: "COURSEWORK",
    message: `Your coursework "${coursework.name}" was deleted successfully.`,
    referenceId: courseworkId,
  });
};

module.exports = {
  createCoursework,
  getCourseworkById,
  updateCoursework,
  deleteCoursework,
};
