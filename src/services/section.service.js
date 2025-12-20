const Section = require('../models/Section');
const SectionMember = require('../models/SectionMember');
const User = require('../models/User');
const mongoose = require('mongoose');
/**
 * Create section and assign instructors
 */
exports.createSection = async ({ classId, section_name, instructorIds }) => {
  if (!instructorIds || instructorIds.length === 0) {
    throw { status: 400, message: 'At least one instructor must be assigned.' };
  }

  const instructors = await User.find({
    _id: { $in: instructorIds },
    role: 'Instructor',
  });

  if (instructors.length !== instructorIds.length) {
    throw { status: 400, message: 'One or more users are not instructors.' };
  }

  const section = await Section.create({
    classId,
    section_name,
  });

  await SectionMember.insertMany(
    instructorIds.map((id) => ({
      sectionId: section._id,
      userId: id,
    }))
  );

  return section;
};

/**
 * Get all sections for a class
 */
exports.getSectionsByClass = async (classId) => {
  return await Section.find({ classId }).sort({ created_at: 1 });
};

/**
 * Update section name
 */
exports.updateSection = async ({ classId, sectionId, section_name }) => {
  // Handle CastError early (invalid ObjectId)
  if (!mongoose.Types.ObjectId.isValid(sectionId)) {
    throw {
      status: 400,
      message: `Invalid section ID format. Expected 24-character hexadecimal string, got: '${sectionId}'`
    };
  }

  const section = await Section.findOneAndUpdate(
    { _id: sectionId, classId },
    { section_name },
    { new: true, runValidators: true }
  );

  if (!section) {
    throw { status: 404, message: `Section with ID '${sectionId}' not found in this class.` };
  }

  return section;
};
/**
 * Delete section and its members
 */
exports.deleteSection = async ({ classId, sectionId }) => {
  if (!mongoose.Types.ObjectId.isValid(sectionId)) {
    throw {
      status: 400,
      message: `Invalid section ID.`
    };
  }
  const section = await Section.findOneAndDelete({
    _id: sectionId,
    classId,
  });

  if (!section) {
    throw { status: 404, message: 'Section not found.' };
  }

  await SectionMember.deleteMany({ sectionId });

  return section;
};

/**
 * Student joins section
 */
exports.joinSection = async ({ classId, sectionId, userId }) => {
  const section = await Section.findOne({ _id: sectionId, classId });
  if (!section) {
    throw { status: 404, message: 'Section does not belong to this class.' };
  }

  const user = await User.findById(userId);
  if (!user || user.role !== 'Student') {
    throw { status: 403, message: 'Only students can join sections.' };
  }

  const exists = await SectionMember.findOne({ sectionId, userId });
  if (exists) {
    throw { status: 409, message: 'Student already joined this section.' };
  }

  return await SectionMember.create({ sectionId, userId });
};

/**
 * Get all members of a section (students + instructors)
 */
exports.getSectionMembers = async ({ classId, sectionId }) => {
  // Verify section belongs to class
  const section = await Section.findOne({ _id: sectionId, classId });
  if (!section) {
    throw { status: 404, message: 'Section not found in this class.' };
  }

  // Get all member userIds
  const members = await SectionMember.find({ sectionId }).select('userId');

  if (members.length === 0) {
    return [];
  }

  const userIds = members.map((m) => m.userId);

  // Populate user details
  return await User.find(
    { _id: { $in: userIds } },
    'first_name last_name email role' //only returns non-sensitive user data
  );
};

/**
 * Assign additional instructors to an existing section
 */
exports.assignInstructorsToSection = async ({ classId, sectionId, instructorIds }) => {
  //Validate input
  if (!instructorIds || !Array.isArray(instructorIds) || instructorIds.length === 0) {
    throw { status: 400, message: 'At least one instructor ID is required.' };
  }

  //Verify section exists in class
  const section = await Section.findOne({ _id: sectionId, classId });
  if (!section) {
    throw { status: 404, message: 'Section not found in this class.' };
  }

  //Validate all users are instructors
  const instructors = await User.find({
    _id: { $in: instructorIds },
    role: 'Instructor'
  });

  if (instructors.length !== instructorIds.length) {
    throw { status: 400, message: 'One or more provided IDs are not valid instructors.' };
  }

  //Prevent duplicates: get existing instructor IDs in this section
  const existingMembers = await SectionMember.find({
    sectionId,
    userId: { $in: instructorIds }
  }, 'userId');

  const existingIds = existingMembers.map(m => m.userId.toString());
  const newInstructors = instructorIds.filter(id => !existingIds.includes(id.toString()));

  if (newInstructors.length === 0) {
    // All already assigned → return success (idempotent)
    return { assigned: [], message: 'All instructors already assigned.' };
  }

  // Add new instructors
  const newMembers = newInstructors.map(userId => ({
    sectionId,
    userId
  }));

  await SectionMember.insertMany(newMembers);

  return {
    assigned: newInstructors,
    message: `${newInstructors.length} instructor(s) assigned successfully.`
  };
};