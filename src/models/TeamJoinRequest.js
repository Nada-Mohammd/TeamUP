const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const teamJoinRequestSchema = new Schema(
  {
    // Team being requested to join
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team ID is required.'],
      index: true,
    },

    // Student requesting to join
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester ID is required.'],
      index: true,
    },

    // Team leader at time of request (denormalized for fast access)
    leaderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Leader ID is required.'],
      index: true,
    },

    // Status of the request
    status: {
      type: String,
      required: [true, 'Request status is required.'],
      enum: {
        values: ['PENDING', 'ACCEPTED', 'REJECTED'],
        message: '{VALUE} is not a supported request status.',
      },
      default: 'PENDING',
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
  }
);

// Prevent duplicate PENDING requests from same student to same team
teamJoinRequestSchema.index(
  { teamId: 1, requesterId: 1 },
  { 
    unique: true, 
    partialFilterExpression: { status: 'PENDING' } 
  }
);

// Validation: Ensure requester is a student
teamJoinRequestSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('requesterId')) {
    const User = this.model('User');
    const requester = await User.findById(this.requesterId).select('role');
    if (!requester || requester.role !== 'Student') {
      return next(new Error('Only students can request to join teams.'));
    }
  }
  next();
});

// Validation: Ensure leader is actually the current leader of the team
teamJoinRequestSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('leaderId') || this.isModified('teamId')) {
    const TeamMember = this.model('TeamMember');
    const isLeader = await TeamMember.findOne({
      teamId: this.teamId,
      studentId: this.leaderId,
      role: 'LEADER'
    });
    if (!isLeader) {
      return next(new Error('Specified leader is not the actual leader of this team.'));
    }
  }
  next();
});

// Auto-set respondedAt when status changes from PENDING
teamJoinRequestSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status !== 'PENDING' && !this.respondedAt) {
    this.respondedAt = new Date();
  }
  next();
});

// Indexes for common queries
teamJoinRequestSchema.index({ leaderId: 1, status: 1, createdAt: -1 });
teamJoinRequestSchema.index({ requesterId: 1, status: 1 });

module.exports = model('TeamJoinRequest', teamJoinRequestSchema);