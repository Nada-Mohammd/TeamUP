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
    class_code: {
      type: String,
      required: [true, 'Class code is required.'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'Class code cannot exceed 50 characters.'],
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
    // FK: created_by → User
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator (instructor) is required.'],
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// Validate that createdBy is an instructor
classSchema.pre('save', async function (next) {
  if (!this.isNew && !this.isModified('createdBy')) return next();

  const user = await this.model('User').findById(this.createdBy);
  if (!user || user.role !== 'Instructor') {
    return next(new Error('Only instructors can create classes.'));
  }

  next();
});

const Class = model('Class', classSchema);
module.exports = Class;