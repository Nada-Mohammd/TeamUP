const Post = require("../models/Post");
const User = require("../models/User");
const ClassProfile = require("../models/ClassProfile");
const notificationService = require("./notification.service");
const Class = require("../models/Class");

/**
 * Build short preview for notification body
 */
const buildPreview = (text, length = 60) => {
  if (!text) return "";
  return text.length > length ? text.slice(0, length) + "…" : text;
};

/**
 * ====================================================
 * CREATE ANNOUNCEMENT
 * ====================================================
 */
const createAnnouncement = async (instructorId, classId, announcement_text) => {
  // Validate instructor
  const user = await User.findById(instructorId);
  if (!user || user.role !== "Instructor") {
    throw new Error("Only instructors can create announcements.");
  }

  if (!classId || !announcement_text?.trim()) {
    throw new Error("Class ID and announcement text are required.");
  }

  const announcement = await Post.create({
    type: "ANNOUNCEMENT",
    classId,
    authorId: instructorId,
    announcement_text: announcement_text.trim(),
  });

  const preview = buildPreview(announcement.announcement_text);

  // Notify students
  const classMembers = await ClassProfile.find({
    classId,
    classRole: "member",
  }).populate("userId", "role");

  const classEntity = await Class.findById(classId);

  const studentProfiles = classMembers.filter(
    (profile) => profile.userId?.role === "Student",
  );

  if (studentProfiles.length) {
    await notificationService.createBulkNotifications(
      studentProfiles.map((profile) => ({
        userId: profile.userId._id,
        type: "ANNOUNCEMENT",
        message: `New announcement:\n"${preview}"`,
        referenceId: announcement._id,
        courseCode: classEntity.course_code,
        classColor: classEntity.class_color,
      })),
    );
  }

  // Notify instructor
  await notificationService.createNotification({
    userId: instructorId,
    type: "ANNOUNCEMENT",
    message: "Your announcement was posted successfully.",
    referenceId: announcement._id,
    courseCode: classEntity.course_code,
    classColor: classEntity.class_color,
  });

  return announcement;
};

/**
 * ====================================================
 * GET CLASS ANNOUNCEMENTS
 * ====================================================
 */
const getClassAnnouncements = async (classId) => {
  return Post.find({
    classId,
    type: "ANNOUNCEMENT",
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .populate("authorId", "name");
};

/**
 * ====================================================
 * UPDATE ANNOUNCEMENT
 * ====================================================
 */
const updateAnnouncement = async (
  announcementId,
  instructorId,
  announcement_text,
) => {
  if (!announcement_text?.trim()) {
    throw new Error("Announcement text is required.");
  }

  const announcement = await Post.findOne({
    _id: announcementId,
    type: "ANNOUNCEMENT",
    isDeleted: false,
  });

  if (!announcement) {
    throw new Error("Announcement not found.");
  }

  if (announcement.authorId.toString() !== instructorId.toString()) {
    throw new Error("You are not allowed to update this announcement.");
  }

  announcement.announcement_text = announcement_text.trim();
  await announcement.save();

  const preview = buildPreview(announcement.announcement_text);

  /**
   * Notify STUDENTS (announcement edited)
   */
  const classMembers = await ClassProfile.find({
    classId: announcement.classId,
    classRole: "member",
  }).populate("userId", "role");

  const classEntity = await Class.findById(announcement.classId);

  const studentProfiles = classMembers.filter(
    (profile) => profile.userId?.role === "Student",
  );

  if (studentProfiles.length) {
    const notifications = studentProfiles.map((profile) => ({
      userId: profile.userId._id,
      type: "ANNOUNCEMENT",
      message: `Announcement updated:\n"${preview}"`,
      referenceId: announcement._id,
      courseCode: classEntity.course_code,
      classColor: classEntity.class_color,
    }));

    await notificationService.createBulkNotifications(notifications);
  }

  /**
   * Notify INSTRUCTOR
   */
  await notificationService.createNotification({
    userId: instructorId,
    type: "ANNOUNCEMENT",
    message: "Your announcement was updated successfully.",
    referenceId: announcement._id,
    courseCode: classEntity.course_code,
    classColor: classEntity.class_color,
  });

  return announcement;
};

/**
 * ====================================================
 * DELETE ANNOUNCEMENT (SOFT DELETE)
 * ====================================================
 */
const deleteAnnouncement = async (announcementId, instructorId) => {
  const announcement = await Post.findOne({
    _id: announcementId,
    type: "ANNOUNCEMENT",
    isDeleted: false,
  });

  if (!announcement) {
    throw new Error("Announcement not found.");
  }

  if (announcement.authorId.toString() !== instructorId.toString()) {
    throw new Error("You are not allowed to delete this announcement.");
  }

  announcement.isDeleted = true;
  await announcement.save();

  await notificationService.createNotification({
    userId: instructorId,
    type: "ANNOUNCEMENT",
    message: "Your announcement was deleted.",
    referenceId: announcement._id,
    courseCode: classEntity.course_code,
    classColor: classEntity.class_color,
  });

  return true;
};

module.exports = {
  createAnnouncement,
  getClassAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
};
