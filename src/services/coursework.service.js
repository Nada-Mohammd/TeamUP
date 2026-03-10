const Coursework = require("../models/CourseWork");
const User = require("../models/User");
const ClassProfile = require("../models/ClassProfile");
const notificationService = require("./notification.service");
const Post = require("../models/Post");
const Class = require("../models/Class");
const StudentProfile = require("../models/StudentProfile");
const Team = require("../models/Team");
const TeamMember = require("../models/TeamMembers");
const TeamJoinRequest = require("../models/TeamJoinRequest");
const mongoose = require("mongoose");

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

  const classObj = await Class.findById(classId);

  if (studentProfiles.length) {
    await notificationService.createBulkNotifications(
      studentProfiles.map((profile) => ({
        userId: profile.userId._id,
        type: "COURSEWORK",
        message: `New coursework "${name}" has been added. Deadline: ${new Date(
          deadline,
        ).toLocaleDateString()}`,
        courseCode: classObj.course_code,
        classColor: classObj.class_color,
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
    courseCode: classObj.course_code,
    classColor: classObj.class_color,
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

  const classEntity = await Class.findById(coursework.classId);

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
    courseCode: classEntity.course_code,
    classColor: classEntity.class_color,
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

  const classEntity = await Class.findById(coursework.classId);

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
        courseCode: classEntity.course_code,
        classColor: classEntity.class_color,
      })),
    );
  }

  // 7. Notify instructor
  await notificationService.createNotification({
    userId: instructorId,
    type: "COURSEWORK",
    message: `Your coursework "${coursework.name}" was deleted successfully.`,
    referenceId: courseworkId,
    courseCode: classEntity.course_code,
    classColor: classEntity.class_color,
  });
};

// GET /coursework/:id/students/available
const getAvailableStudents = async (courseworkId, classId, userId, teamId) => {

  // ── 1. Get all students enrolled in the class
  const studentProfiles = await ClassProfile.find({ classId, classRole: "member" })
    .select("userId")
    .lean();

  if (studentProfiles.length === 0) {
    throw new Error("No students are enrolled in this class.");
  }

  const allStudentIds = studentProfiles.map((p) => p.userId);

  // ── 2. Get all studentIds that are members of any team for this coursework
  const teams = await Team.find({ courseworkId }).select("_id").lean();
  const teamIds = teams.map((t) => t._id);

  let studentIdsInTeams = [];
  if (teamIds.length > 0) {
    const teamMembers = await TeamMember.find({ teamId: { $in: teamIds } })
      .select("studentId")
      .lean();
    studentIdsInTeams = teamMembers.map((m) => m.studentId.toString());
  }

  const teamsSet = new Set(studentIdsInTeams);

  // ── 3. Filter out students who are already in a team
  const availableStudentIds = allStudentIds.filter(
    (id) => !teamsSet.has(id.toString()),
  );

  if (availableStudentIds.length === 0) return [];

  // ── 4. Fetch user and profile details for available students
  const users = await User.find({ _id: { $in: availableStudentIds }, role: "Student" })
    .select("_id first_name last_name email")
    .lean();

  const profiles = await StudentProfile.find({ user_id: { $in: availableStudentIds } })
    .select("user_id profile_picture")
    .lean();

  const profileMap = new Map(
    profiles.map((p) => [p.user_id.toString(), p.profile_picture])
  );

  // ── 5. Build student list with invitation_status defaulting to null
  const availableStudents = users.map((u) => ({
    user_id: u._id,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    profile_picture: profileMap.get(u._id.toString()) ?? null,
    invitation_status: null,
  }));

  // ── 6. Fetch invitations sent by requesting user from their specific team
  //    teamId is scoped to this exact team — no cross-coursework bleed possible.
  console.log("user id", userId);
  console.log("team id", teamId);
  const invitations = await TeamJoinRequest.find({
    teamId,
    senderId: userId,
    receiverId: { $in: availableStudentIds },
    flowType: "LEADER_INVITATION",
  })
    .select("receiverId status")
    .lean();

  console.log("Invitations found:", invitations.length, invitations);

  if (invitations.length > 0) {
    const invitationMap = new Map(
      invitations.map((inv) => [inv.receiverId.toString(), inv.status])
    );

    console.log("Invitation Map:", invitationMap);

    for (const student of availableStudents) {
      const status = invitationMap.get(student.user_id.toString());
      if (status) student.invitation_status = status;
    }
  }

  return availableStudents;
};

module.exports = {
  createCoursework,
  getCourseworkById,
  updateCoursework,
  deleteCoursework,
  getAvailableStudents,
};
