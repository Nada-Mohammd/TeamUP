const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const teamJoinRequestSchema = new Schema(
  {
    // Team for this request/invitation
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: [true, "Team ID is required."],
      index: true,
    },

    // Sender of request/invitation
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required."],
      index: true,
    },

    // Receiver of request/invitation
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver ID is required."],
      index: true,
    },

    // Flow type for single-model support
    flowType: {
      type: String,
      required: [true, "Flow type is required."],
      enum: {
        values: ["STUDENT_REQUEST", "LEADER_INVITATION"],
        message: "{VALUE} is not a supported flow type.",
      },
      index: true,
    },

    // Status of the request
    status: {
      type: String,
      required: [true, "Request status is required."],
      enum: {
        values: ["PENDING", "ACCEPTED", "REJECTED"],
        message: "{VALUE} is not a supported request status.",
      },
      default: "PENDING",
      index: true,
    },

    // When the request was created
    createdAt: {
      type: Date,
      default: Date.now,
    },

    // When the leader responded (nullable)
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate PENDING items for same sender->receiver on same team and flow
teamJoinRequestSchema.index(
  { teamId: 1, senderId: 1, receiverId: 1, flowType: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "PENDING" },
  },
);

// Validation: Ensure sender/receiver roles match flow direction
teamJoinRequestSchema.pre("save", async function (next) {
  if (
    this.isNew ||
    this.isModified("senderId") ||
    this.isModified("receiverId") ||
    this.isModified("flowType")
  ) {
    const User = this.model("User");
    const sender = await User.findById(this.senderId).select("role");
    const receiver = await User.findById(this.receiverId).select("role");

    if (!sender || !receiver) {
      return next(new Error("Sender and receiver must exist."));
    }

    if (this.flowType === "STUDENT_REQUEST") {
      if (sender.role !== "Student" || receiver.role !== "Student") {
        return next(
          new Error(
            "Student request must be from student to team leader (student).",
          ),
        );
      }
    }

    if (this.flowType === "LEADER_INVITATION") {
      if (sender.role !== "Student" || receiver.role !== "Student") {
        return next(
          new Error(
            "Leader invitation must be from leader (student) to student.",
          ),
        );
      }
    }
  }
  next();
});

// Validation: Ensure sender/receiver alignment with actual team leader by flow
teamJoinRequestSchema.pre("save", async function (next) {
  if (
    this.isNew ||
    this.isModified("senderId") ||
    this.isModified("receiverId") ||
    this.isModified("teamId") ||
    this.isModified("flowType")
  ) {
    const TeamMember = this.model("TeamMember");
    const leaderMembership = await TeamMember.findOne({
      teamId: this.teamId,
      role: "LEADER",
    }).select("studentId");

    if (!leaderMembership) {
      return next(
        new Error("Team must have a valid leader before creating requests."),
      );
    }

    const leaderId = leaderMembership.studentId.toString();
    const senderId = this.senderId.toString();
    const receiverId = this.receiverId.toString();

    if (this.flowType === "STUDENT_REQUEST" && receiverId !== leaderId) {
      return next(
        new Error("For student requests, receiver must be the team leader."),
      );
    }

    if (this.flowType === "LEADER_INVITATION" && senderId !== leaderId) {
      return next(
        new Error("For leader invitations, sender must be the team leader."),
      );
    }

    const isSenderLeader = await TeamMember.findOne({
      teamId: this.teamId,
      studentId: this.senderId,
      role: "LEADER",
    });

    const isReceiverLeader = await TeamMember.findOne({
      teamId: this.teamId,
      studentId: this.receiverId,
      role: "LEADER",
    });

    if (this.flowType === "STUDENT_REQUEST" && isSenderLeader) {
      return next(
        new Error(
          "Team leader cannot create student join request to own team.",
        ),
      );
    }

    if (this.flowType === "LEADER_INVITATION" && isReceiverLeader) {
      return next(new Error("Cannot invite team leader as a student member."));
    }
  }
  next();
});

// Auto-set respondedAt when status changes from PENDING
teamJoinRequestSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status !== "PENDING" &&
    !this.respondedAt
  ) {
    this.respondedAt = new Date();
  }
  next();
});

// Indexes for common queries
teamJoinRequestSchema.index({ receiverId: 1, status: 1, createdAt: -1 });
teamJoinRequestSchema.index({ senderId: 1, status: 1, createdAt: -1 });
teamJoinRequestSchema.index({ teamId: 1, flowType: 1, status: 1 });

module.exports = model("TeamJoinRequest", teamJoinRequestSchema);
