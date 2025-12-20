const Class = require('../models/Class');
const ClassProfile = require('../models/ClassProfile');
const User = require('../models/User');
const generateClassCode = require('../utils/ClassUtils/classCodeGeneration');

const getClasses = async (userId) => {
  // Find all class profiles for the user
  const classProfiles = await ClassProfile.find({ userId }).populate('classId');
  // Extract class details
  const classes = classProfiles.map(profile => profile.classId);
  return classes;
};

const createClass = async (instructorId, classData) => {
  // Step 1: Validate the instructor
  const user = await User.findById(instructorId);
  if (!user || user.role !== 'Instructor') {
    throw new Error('Only instructors can create classes.');
  }

  // Step 2: Validate input fields
  const { course_name, course_code, year, course_plan } = classData;
  if (!course_name || !course_code || !year) {
    throw new Error('Missing required fields: course name, course code, year.');
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
    course_plan: course_plan || '',
    createdBy: instructorId,
    class_code,
  });

  // Step 5: Automatically assign the instructor as admin in ClassProfile
  await ClassProfile.create({
    classId: newClass._id,
    userId: instructorId,
    classRole: 'admin',
  });

  return newClass;
};

const getClassCode = async (classId, userId) => {
  const membership = await ClassProfile.findOne({ classId, userId });

  if (!membership) {
    throw new Error('Not a class member');
  }

  if (membership.classRole !== 'admin') {
    throw new Error('Admins only can view class code');
  }

  const classObj = await Class.findById(classId).select('class_code');

  if (!classObj) {
    throw new Error('Class not found');
  }

  return classObj.class_code;
};

const searchUsers = async (classId, username) => {
  if (!username) return [];

  const c = await Class.findById(classId);
  if (!c) {
    throw new Error('Class does not exist.');
  }
  // get all members of the class
  const classProfiles = await ClassProfile.find({ classId }).select('userId');
  const memberIdSet = new Set(
    classProfiles.map(p => p.userId.toString())
  );

  // search users by username
  const users = await User.find({
    username: { $regex: username, $options: 'i' },
  }).select('_id username first_name last_name role');

  // flag users if they're already in the class or not
  const result = users.map(user => ({
    _id: user._id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    isAlreadyInClass: memberIdSet.has(user._id.toString()),
  }));

  return result;
};

// const inviteUser = async (classId, senderId, receiverId, role = 'member') => {
//   // verify sender is admin
//   const adminProfile = await ClassProfile.findOne({
//     classId,
//     userId: senderId,
//     classRole: 'admin',
//   });

//   if (!adminProfile) {
//     throw new Error('Only class admins can invite users.');
//   }

//   // check receiver exists
//   const receiver = await User.findById(receiverId);
//   if (!receiver) {
//     throw new Error('User does not exist.');
//   }

//   // check already in class
//   const alreadyMember = await ClassProfile.findOne({
//     classId,
//     userId: receiverId,
//   });

//   if (alreadyMember) {
//     throw new Error('User is already in this class.');
//   }

//   // instructor validation for admin role
//   if (role === 'admin' && receiver.role !== 'Instructor') {
//     throw new Error('Only instructors can be class admins.');
//   }

//   // create invitation
//   const invitation = await ClassInvitation.create({
//     classId,
//     senderId,
//     receiverId,
//     role,
//   });

//   return invitation;
// };

module.exports = { getClasses, createClass, getClassCode, searchUsers };