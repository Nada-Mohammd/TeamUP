const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const postSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['COURSEWORK', 'ANNOUNCEMENT'],
      required: true,
      index: true,
    },

    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },

    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /**
     * Used ONLY if type === ANNOUNCEMENT
     */
    announcement_text: {
      type: String,
      trim: true,
    },

    /**
     * Used ONLY if type === COURSEWORK
     */
    courseworkId: {
      type: Schema.Types.ObjectId,
      ref: 'Coursework',
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/**
 * Validation: exactly one content type
 */
postSchema.pre('validate', function (next) {
  if (this.type === 'ANNOUNCEMENT' && !this.announcement_text) {
    return next(new Error('Announcement text is required.'));
  }

  if (this.type === 'COURSEWORK' && !this.courseworkId) {
    return next(new Error('Coursework ID is required.'));
  }

  next();
});

postSchema.index({ classId: 1, createdAt: -1 });

module.exports = model('Post', postSchema);
