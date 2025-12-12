// classModel.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const classSchema = new Schema(
  {
    course_name: {
      type: String,
      required: [true, 'Course name is required.'],
      trim: true,
      maxlength: [255, 'Course name cannot exceed 255 characters.'],
    },
    course_code: {
      type: String,
      required: [true, 'Course code (e.g., DS342) is required.'],
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{2,4}\d{3,4}$/, 'Course code must be in format like DS342 or CS1010.'],
    },
    class_code: {
      type: String,
      required: [true, 'Class invite code is required.'],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [10, 'Class code cannot exceed 10 characters.'],
    },
    year: {
      type: Number,
      required: [true, 'Academic year is required.'],
      min: [2000, 'Year must be 2000 or later.'],
      max: [2100, 'Year must be 2100 or earlier.'],
    },
    policy: {
      type: String,
      required: [true, 'Class policy is required.'],
      trim: true,
    },
    course_plan: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator (instructor) is required.'],
    },
  },
  {
    timestamps: true,
  }
);

//validate instructor 
classSchema.pre('save', async function (next) {
  if (this.isNew) {
    const User = this.model('User');
    const user = await User.findById(this.createdBy).select('role');
    if (!user || user.role !== 'Instructor') {
      return next(new Error('Only instructors can create classes.'));
    }
  }
  next();
});

module.exports = model('Class', classSchema);