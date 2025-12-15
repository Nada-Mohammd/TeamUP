const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const sectionMemberSchema = new Schema(
  {
    // FK → Section
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section ID is required.'],
    },

    // FK → User
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
    },

    joined_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = model('SectionMember', sectionMemberSchema);
