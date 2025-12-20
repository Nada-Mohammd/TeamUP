const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const classInvitationSchema = new Schema(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },

    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

classInvitationSchema.index(
  { classId: 1, receiverId: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

module.exports = model('ClassInvitation', classInvitationSchema);
