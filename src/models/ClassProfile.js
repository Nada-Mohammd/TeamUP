const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const classProfileSchema = new Schema(
  {
    // FK: class_id → Class
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required.'],
    },
    // FK: user_id → User
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
    },
    classRole: {
      type: String,
      required: [true, 'Class role is required.'],
      enum: {
        values: ['admin', 'member'],
        message: '{VALUE} is not a supported class role.',
      },
      default: 'member',
    },
    joined_date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// Ensure uniqueness: one user can only have one profile per class
classProfileSchema.index({ classId: 1, userId: 1 }, { unique: true });

//Validate that if classRole is 'admin', the user must be an instructor
classProfileSchema.pre('save', async function (next) {
  const user = await this.model('User').findById(this.userId);
  if (!user) {
    return next(new Error('User does not exist.'));
  }

  if (this.classRole === 'admin' && user.role !== 'Instructor') {
    return next(new Error('Only instructors can be admins in a class.'));
  }

  next();
});

const ClassProfile = model('ClassProfile', classProfileSchema);
module.exports = ClassProfile;