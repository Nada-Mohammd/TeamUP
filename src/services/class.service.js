const Class = require("../models/Class");
const ClassProfile = require("../models/ClassProfile");
const User = require("../models/User");
const ClassInvitation = require("../models/ClassInvitation");
const Notification = require("../models/Notification");
const generateClassCode = require("../utils/ClassUtils/classCodeGeneration");
const { onlineUsers } = require("../sockets/socket");

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
  const { course_name, course_code, year, course_plan } = classData;
  if (!course_name || !course_code || !year) {
    throw new Error("Missing required fields: course name, course code, year.");
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
    calendar_events: [],
  });

  // Emit notification in real-time if user is online
  const socketId = onlineUsers.get(receiverId.toString());

  if (socketId) {
    io.to(socketId).emit("newNotification", notification);
  }

  return invitation;
};

module.exports = {
  getClasses,
  createClass,
  getClassCode,
  searchUsers,
  createInvitation,
};
