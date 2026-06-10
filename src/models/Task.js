const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const taskSchema = new Schema(
  {
    team_id: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: [true, "Team ID is required."],
      index: true,
    },

    creator_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator ID is required."],
    },

    assignee_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    name: {
      type: String,
      required: [true, "Task name is required."],
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Task description is required."],
      trim: true,
    },

    deadline: {
      type: Date,
      required: [true, "Deadline is required."],
    },

    deliverable_type: {
      type: String,
      required: [true, "Deliverable type is required."],
      enum: {
        values: [
          ".pdf",
          ".docx",
          ".pptx",
          ".xlsx",
          ".zip",
          ".txt",
          ".py",
          ".jpg",
          ".jpeg",
          ".png",
        ],
        message:
          "{VALUE} is not a supported deliverable type.",
      },
    },

    status: {
      type: String,
      required: [true, "Status is required."],
      enum: {
        values: [
          "To Do",
          "In Progress",
          "Done",
        ],
        message:
          "{VALUE} is not a supported task status.",
      },
      default: "To Do",
    },

    marked_as_done_at: {
  type: Date,
  default: null,
},

    deliverable_file_url: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({
  team_id: 1,
  deadline: 1,
});

module.exports = model("Task", taskSchema);