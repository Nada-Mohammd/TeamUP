const Class = require("../models/Class");
const ClassProfile = require("../models/ClassProfile");
const User = require("../models/User");
const ClassInvitation = require("../models/ClassInvitation");
const Notification = require("../models/Notification");
const generateClassCode = require("../utils/ClassUtils/classCodeGeneration");
const { onlineUsers, io } = require("../sockets/socket");
const Post = require("../models/Post");

const getClasses = async (userId) => {
  // Find all class profiles for the user
  const classProfiles = await ClassProfile.find({ userId }).populate("classId");
  // Extract class details
  const classes = classProfiles.map((profile) => profile.classId);
  return classes;
};

const createClass = async (instructorId, classData) => {
  // Step 1: Validate the instructor
  const user = await User.findById(instructorId);
  if (!user || user.role !== "Instructor") {
    throw new Error("Only instructors can create classes.");
  }

  // Step 2: Validate input fields
  const { course_name, course_code, year, course_plan, class_color } =
    classData;
  if (!course_name || !course_code || !year || !class_color) {
    throw new Error(
      "Missing required fields: course name, course code, year, class color.",
    );
  }

  const existingCourse = await Class.findOne({ course_code });
  if (existingCourse) {
    throw new Error("A class with this course code already exists.");
  }

  // Step 3: Generate unique class code

  let class_code;
  let isUnique = false;

  // Ensure the class_code is unique in DB
  while (!isUnique) {
    class_code = generateClassCode();
    const existing = await Class.findOne({ class_code });
    if (!existing) isUnique = true;
  }

  // Step 4: Create the class
  const newClass = await Class.create({
    course_name,
    course_code,
    year,
    class_color,
    course_plan: course_plan || "",
    createdBy: instructorId,
    class_code,
  });

  // Step 5: Automatically assign the instructor as admin in ClassProfile
  await ClassProfile.create({
    classId: newClass._id,
    userId: instructorId,
    classRole: "admin",
  });

  return newClass;
};

const editClass = async (classId, instructorId, updateData) => {
  // Step 1: Find the class
  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    throw new Error("Class not found.");
  }

  // Step 2: Verify the user is an Instructor (optional but safe)
  const user = await User.findById(instructorId);
  if (!user || user.role !== "Instructor") {
    throw new Error("Only instructors can edit classes.");
  }

  // Step 3: Verify the instructor is an admin in this class via ClassProfile
  const clsProfile = await ClassProfile.findOne({
    classId: classDoc._id,
    userId: instructorId,
    classRole: "admin",
  });
  if (!clsProfile) {
    throw new Error("You do not have permission to edit this class.");
  }

  // Step 4: Extract and validate update fields
  const { course_name, course_code, year, course_plan, class_color } =
    updateData;

  if (!course_name?.trim()) {
    throw new Error("Course name cannot be empty.");
  }
  if (!course_code?.trim()) {
    throw new Error("Course code cannot be empty.");
  }
  if (year == null || year < 2000 || year > 2100) {
    throw new Error("Valid academic year is required (2000–2100).");
  }
  if (!class_color?.match(/^#([0-9A-Fa-f]{6})$/)) {
    throw new Error("Class color must be a valid hex color.");
  }

  // Step 5: Optional – Prevent duplicate class (same name)
  const duplicateCourseName = await Class.findOne({
    course_name: course_name,
    _id: { $ne: classId }, // exclude current class
  });
  if (duplicateCourseName) {
    throw new Error("A class with this name already exists.");
  }

  //Prevent duplicate class (same Code)
  const duplicateCourseCode = await Class.findOne({
    course_code: course_code,
    _id: { $ne: classId }, // exclude current class
  });
  if (duplicateCourseCode) {
    throw new Error("A class with this code already exists.");
  }

  // Step 6: Apply updates
  classDoc.course_name = course_name;
  classDoc.course_code = course_code;
  classDoc.year = year;
  classDoc.course_plan = course_plan || "";
  classDoc.class_color = class_color;

  // Step 7: Save and return
  const updated = await classDoc.save();

  // Optionally exclude sensitive fields in response
  return {
    course_name: updated.course_name,
    course_code: updated.course_code,
    year: updated.year,
    course_plan: updated.course_plan,
    class_code: updated.class_code,
    class_color: updated.class_color,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
};

const deleteClass = async (classId, instructorId) => {
  // Step 1: Find the class
  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    throw new Error("Class not found.");
  }

  // Step 2: Verify the user is an Instructor
  const user = await User.findById(instructorId);
  if (!user || user.role !== "Instructor") {
    throw new Error("Only instructors can delete classes.");
  }

  // Step 3: Verify the instructor is an admin in this class
  const clsProfile = await ClassProfile.findOne({
    classId: classDoc._id,
    userId: instructorId,
    classRole: "admin",
  });
  if (!clsProfile) {
    throw new Error("You do not have permission to delete this class.");
  }

  // Step 4: Delete all related data (adjust based on your actual models)
  // ⚠️ You MUST delete dependent documents to avoid orphaned data

  // Example: Delete all ClassProfiles (roster)
  await ClassProfile.deleteMany({ classId: classDoc._id });

  // Step 5: Delete the class itself
  await Class.findByIdAndDelete(classId);

  // Step 6: Return minimal class info for success message
  return {
    _id: classDoc._id,
    course_name: classDoc.course_name,
  };
};

const getClassCode = async (classId, userId) => {
  const membership = await ClassProfile.findOne({ classId, userId });

  if (!membership) {
    throw new Error("Not a class member");
  }

  if (membership.classRole !== "admin") {
    throw new Error("Admins only can view class code");
  }

  const classObj = await Class.findById(classId).select("class_code");

  if (!classObj) {
    throw new Error("Class not found");
  }

  return classObj.class_code;
};

const searchUsers = async (classId, username) => {
  if (!username) return [];

  const c = await Class.findById(classId);
  if (!c) {
    throw new Error("Class does not exist.");
  }
  // get all members of the class
  const classProfiles = await ClassProfile.find({ classId }).select("userId");
  const memberIdSet = new Set(classProfiles.map((p) => p.userId.toString()));

  // search users by username
  const users = await User.find({
    username: { $regex: username, $options: "i" },
  }).select("_id username first_name last_name role");

  // flag users if they're already in the class or not
  const result = users.map((user) => ({
    _id: user._id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    isAlreadyInClass: memberIdSet.has(user._id.toString()),
  }));

  return result;
};

const joinClassByCode = async (cls_code, userId) => {
  // Step 1: Validate input
  if (!cls_code?.trim()) {
    throw new Error("Please enter a workspace code.");
  }

  // Step 2: Find class by class_code
  const classDoc = await Class.findOne({ class_code: cls_code });
  if (!classDoc) {
    throw new Error("Invalid class code. Please check the code and try again.");
  }

  // Step 3: Check if user is already a member
  const existingMembership = await ClassProfile.findOne({
    classId: classDoc._id,
    userId: userId,
  });
  if (existingMembership) {
    throw new Error("You are already a member of this workspace.");
  }

  // Step 4: Add user as 'member' to the class
  await ClassProfile.create({
    classId: classDoc._id,
    userId: userId,
    classRole: "member", // ← all joiners via code are members (not admins)
  });

  // Step 5: Return class info for success message
  return {
    _id: classDoc._id,
    course_name: classDoc.course_name,
    course_code: classDoc.course_code,
  };
};

const createInvitation = async ({ classId, senderId, receiverId }, io) => {
  const classObj = await Class.findById(classId);
  if (!classObj) throw new Error("Class not found");

  const receiver = await User.findById(receiverId);
  const sender = await User.findById(senderId);
  if (!receiver) throw new Error("User does not exist");

  const alreadyMember = await ClassProfile.findOne({
    classId,
    userId: receiverId,
  });
  if (alreadyMember) throw new Error("User is already in this class");

  const existingInvite = await ClassInvitation.findOne({
    classId,
    receiverId,
    status: "pending",
  });
  if (existingInvite)
    throw new Error("An invitation is already pending for this user");

  const invitation = await ClassInvitation.create({
    classId,
    senderId,
    receiverId,
  });

  // Save notification in MongoDB
  const notification = await Notification.create({
    userId: receiverId,
    type: "CLASS_INVITATION",
    referenceId: invitation._id,
    message: `${sender.first_name} ${sender.last_name} has invited you to join ${classObj.course_name}`,
    courseCode: classObj.course_code,
    classColor: classObj.class_color,
    calendar_events: [],
  });

  // Emit notification in real-time if user is online
  const socketId = onlineUsers.get(receiverId.toString());

  if (socketId) {
    io.to(socketId).emit("newNotification", notification);
  }

  return invitation;
};

const respondToInvitation = async (invitationId, receiverId, action) => {
  // Step 1: Fetch invitation
  const invitation = await ClassInvitation.findById(invitationId);
  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  // Step 2: Authorization & validation
  if (invitation.receiverId.toString() !== receiverId) {
    throw new Error("You are not authorized to respond to this invitation.");
  }

  if (invitation.status !== "pending") {
    throw new Error("This invitation is no longer active.");
  }

  // Step 3: Handle action
  if (action === "accept") {
    // Verify class still exists
    const classDoc = await Class.findById(invitation.classId);
    if (!classDoc) {
      throw new Error("The class no longer exists.");
    }

    // Ensure not already a member
    const existingMembership = await ClassProfile.findOne({
      classId: invitation.classId,
      userId: receiverId,
    });
    if (existingMembership) {
      throw new Error("You are already a member of this class.");
    }

    // Update status
    invitation.status = "accepted";
    await invitation.save();

    // Add to class
    await ClassProfile.create({
      classId: invitation.classId,
      userId: receiverId,
      classRole: "member",
    });

    // Step 4: Fetch receiver for message
    const receiver = await User.findById(receiverId);

    const senderNotification = await Notification.create({
      userId: invitation.senderId,
      type: "INVITATION_STATUS",
      referenceId: invitation._id,
      message: `${receiver.first_name} ${receiver.last_name} has accepted your invitation to join ${classDoc.course_name}.`,
      courseCode: classDoc.course_code,
      classColor: classDoc.class_color,
      calendar_events: [],
    });

    // Step 5: Emit real-time notification if sender is online
    if (io && onlineUsers) {
      const senderSocketId = onlineUsers.get(invitation.senderId.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("newNotification", senderNotification);
      }
    }

    return {
      classId: invitation.classId,
      className: classDoc.course_name,
    };
  } else if (action === "decline") {
    invitation.status = "rejected";
    await invitation.save();

    const classDoc = await Class.findById(invitation.classId);
    if (!classDoc) {
      throw new Error("The class no longer exists.");
    }

    const receiver = await User.findById(receiverId);

    const senderNotification = await Notification.create({
      userId: invitation.senderId,
      type: "INVITATION_STATUS",
      referenceId: invitation._id,
      message: `${receiver.first_name} ${receiver.last_name} has declined your invitation to join ${classDoc.course_name}.`,
      courseCode: classDoc.course_code,
      classColor: classDoc.class_color,
      calendar_events: [],
    });

    if (io && onlineUsers) {
      const senderSocketId = onlineUsers.get(invitation.senderId.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("newNotification", senderNotification);
      }
    }

    return { success: true };
  }
};

// Main function: Get total member count
const getClassMemberCount = async (classId) => {
  // Optional: Validate class exists
  const classExists = await Class.findById(classId);
  if (!classExists) {
    throw new Error("Class not found.");
  }

  const count = await ClassProfile.countDocuments({ classId });
  return count;
};

const getClassMembers = async (classId, requesterId) => {
  const classExists = await Class.findById(classId);
  if (!classExists) {
    throw new Error("Class not found.");
  }

  const requesterMembership = await ClassProfile.findOne({
    classId,
    userId: requesterId,
  });

  if (!requesterMembership) {
    throw new Error("You are not a member of this class.");
  }

  const classProfiles = await ClassProfile.find({ classId })
    .populate({
      path: "userId",
      select: "first_name last_name username email role",
    })
    .sort({ joined_date: 1 });

  const members = classProfiles
    .filter((profile) => profile.userId)
    .map((profile) => ({
      _id: profile.userId._id,
      first_name: profile.userId.first_name,
      last_name: profile.userId.last_name,
      username: profile.userId.username,
      email: profile.userId.email,
      role: profile.userId.role,
      classRole: profile.classRole,
      joined_date: profile.joined_date,
    }));

  const instructors = members.filter((member) => member.role === "Instructor");
  const students = members.filter((member) => member.role === "Student");

  return {
    instructors,
    students,
  };
};

const getClassPosts = async (classId) => {
  // Validate class exists
  const classExists = await Class.findById(classId);
  if (!classExists) {
    throw new Error("Class not found.");
  }

  // Fetch posts with populated coursework or announcement data
  const posts = await Post.find({
    classId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 }) // newest first
    .populate({
      path: "courseworkId",
      match: { isDeleted: false }, // only active coursework
      select:
        "name description deadline grade team_size_min team_size_max files",
    })
    .populate({
      path: "authorId",
      select: "first_name last_name role",
    });

  // Filter out posts where coursework was deleted (soft-deleted)
  return posts.filter((post) => {
    if (post.type === "COURSEWORK") {
      return post.courseworkId !== null; // coursework exists and is not deleted
    }
    return true; // announcements always valid
  });
};

module.exports = {
  getClasses,
  createClass,
  editClass,
  deleteClass,
  getClassCode,
  searchUsers,
  createInvitation,
  joinClassByCode,
  respondToInvitation,
  getClassMemberCount,
  getClassMembers,
  getClassPosts,
};
