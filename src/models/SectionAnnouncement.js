const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const sectionAnnouncementSchema = new Schema(
  {
    // FK → Section
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section ID is required.'],
    },

    // FK → User (author)
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author ID is required.'],
    },

    title: {
      type: String,
      required: [true, 'Announcement title is required.'],
      trim: true,
      maxlength: [255, 'Title cannot exceed 255 characters.'],
    },

    content: {
      type: String,
      required: [true, 'Announcement content is required.'],
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: true },
  }
);

module.exports = model('SectionAnnouncement', sectionAnnouncementSchema);
