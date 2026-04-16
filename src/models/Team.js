const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const teamSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Team name is required."],
      trim: true,
      maxlength: [100, "Team name cannot exceed 100 characters."],
    },

    // REQUIRED: Team is bound to a coursework
    courseworkId: {
      type: Schema.Types.ObjectId,
      ref: "Coursework",
      required: [true, "Coursework ID is required."],
      index: true,
    },

    // Denormalized for fast queries (copied from Coursework)
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class ID is required."],
      index: true,
    },

    // OPTIONAL: Teams can be cross-sectional (removed mandatory constraint)
    // sectionId: {
    //   type: Schema.Types.ObjectId,
    //   ref: 'Section',
    //   default: null,
    //   index: true,
    // },

    // Auto-assigned instructor from the coursework's class
    //??????????
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // Student who created/leads the team
    leaderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Team leader ID is required."],
      index: true,
    },

    // Team size limit (copied from coursework rules at creation time)
    size: {
      type: Number,
      required: [true, "Team size limit is required."],
      min: [1, "Team size must be at least 1."],
      max: [50, "Team size cannot exceed 50."],
    },

    // Lock status: prevents new join requests/invitations
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Timestamp when team was locked (nullable)
    lockedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Validation: Ensure leader is a student and instructor is actually an instructor
teamSchema.pre("save", async function (next) {
  if (
    this.isNew ||
    this.isModified("leaderId") ||
    this.isModified("instructorId")
  ) {
    const User = this.model("User");

    // Validate leader is a student
    if (this.leaderId) {
      const leader = await User.findById(this.leaderId).select("role");
      if (!leader || leader.role !== "Student") {
        return next(new Error("Team leader must be a student."));
      }
    }

    if (this.instructorId) {
      const instructor = await User.findById(this.instructorId).select("role");
      if (!instructor || instructor.role !== "Instructor") {
        return next(
          new Error("Assigned instructor must have Instructor role."),
        );
      }
    }
  }
  next();
});

// Validation: isLocked and lockedAt consistency
teamSchema.pre("save", function (next) {
  if (this.isLocked && !this.lockedAt) {
    this.lockedAt = new Date();
  }
  if (!this.isLocked) {
    this.lockedAt = null;
  }
  next();
});

// Indexes for common queries
teamSchema.index({ courseworkId: 1, isLocked: 1 });
teamSchema.index({ classId: 1, leaderId: 1 });
teamSchema.index({ leaderId: 1, createdAt: -1 });

module.exports = model("Team", teamSchema);
