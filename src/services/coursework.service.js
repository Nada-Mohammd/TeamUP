const Coursework = require("../models/CourseWork");
const User = require("../models/User");
const ClassProfile = require("../models/ClassProfile");
const notificationService = require("./notification.service");
const Post = require('../models/Post');
const createCoursework = async (instructorId, data) => {
 
  const user = await User.findById(instructorId);
  if (!user || user.role !== "Instructor") {
    throw new Error("Only instructors can create coursework.");
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
    classId,
    files,
  } = data;

  if (!name  || !classId || !deadline) {
    throw new Error(
      "Missing required fields."
    );
  }

  
  if (team_size_min != null && team_size_max != null && team_size_min > team_size_max) {
    throw new Error("team_size_min cannot be greater than team_size_max.");
  }

  //Create coursework
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
  
  //create post
  await Post.create({
    type: 'COURSEWORK',
    classId: coursework.classId,
    authorId: coursework.authorId,
    courseworkId: coursework._id,
  });

//Notify STUDENTS
const classMembers = await ClassProfile.find({
  classId,
  classRole: "member",
}).populate("userId", "role");

const studentProfiles = classMembers.filter(
  profile => profile.userId?.role === "Student"
);

if (studentProfiles.length) {
  const studentNotifications = studentProfiles.map(profile => ({
    userId: profile.userId._id,
    type: "COURSEWORK",
    message: `New coursework ${name} has been added. Deadline: ${new Date(
      deadline
    ).toLocaleDateString()}`,
    referenceId: coursework._id,
  }));

  await notificationService.createBulkNotifications(studentNotifications);
}
// Notify INSTRUCTOR
await notificationService.createNotification({
  userId: instructorId,
  type:"COURSEWORK",
  message: `Your coursework ${name} was created successfully.`,
  referenceId: coursework._id,
});

  return coursework;
};

module.exports = {
  createCoursework,
  
};
