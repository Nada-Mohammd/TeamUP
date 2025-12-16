const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const sectionSchema = new Schema(
  {
   classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required.'],
    },

    section_name: {
      type: String,
      required: [true, 'Section name is required.'],
      trim: true,
      maxlength: [50, 'Section name cannot exceed 50 characters.'],
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: true },
  }
);

// Prevent duplicate section names inside the same class
sectionSchema.index({ classId: 1, section_name: 1 }, { unique: true });

module.exports = model('Section', sectionSchema);
