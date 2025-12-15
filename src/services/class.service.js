const Class = require('../models/Class');
const ClassProfile = require('../models/ClassProfile');
const User = require('../models/User');
const crypto = require('crypto');
const generateClassCode = require('../utils/ClassUtils/classCodeGeneration');

const createClass = async (instructorId, classData) => {
  // Step 1: Validate the instructor
  const user = await User.findById(instructorId);
  if (!user || user.role !== 'Instructor') {
    throw new Error('Only instructors can create classes.');
  }

  // Step 2: Validate input fields
  const { course_name, course_code, year, policy, course_plan } = classData;
  if (!course_name || !course_code || !year) {
    throw new Error('Missing required fields: course_name, course_code, year.');
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
    policy,
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

module.exports = { createClass };
