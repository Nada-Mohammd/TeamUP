const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const calendarEventSchema = new Schema(
  {
    title: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    description: { type: String },
  },
  { _id: false },
);

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "CLASS_INVITATION",
        "MESSAGE",
        "ANNOUNCEMENT",
        "INVITATION_STATUS",
        "COURSEWORK",
        "TEAM_INVITATION", // Student invited to join team
        "TEAM_JOIN_REQUEST", // Leader notified of join request
        "TEAM_REQUEST_ACCEPTED", // Student notified their request was accepted
        "TEAM_REQUEST_REJECTED", // Student notified their request was rejected
        "TEAM_MEMBER_REMOVED",
        "TEAM_LEADER_ASSIGNED",
        "TASK_UPDATED",
        "TASK_ASSIGNED",
        "TASK_UNASSIGNED",
      ],
      index: true,
    },

    /**
     * Points to the domain entity
     * e.g. ClassInvitation._id
     */
    referenceId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    courseCode: {
      type: String,
      default: null,
    },

    classColor: {
      type: String,
      default: null,
    },

    message: {
      type: String,
      required: true,
    },

    /**
     * Optional calendar integration
     */
    calendar_events: {
      type: [calendarEventSchema],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = model("Notification", notificationSchema);
