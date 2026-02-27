const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const teamMemberSchema = new Schema(
  {
    // Team this member belongs to
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team ID is required.'],
      index: true,
    },

    // Student who is a member of the team
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required.'],
      index: true,
    },

    // Role within the team
    role: {
      type: String,
      required: [true, 'Role is required.'],
      enum: {
        values: ['LEADER', 'MEMBER'],
        message: '{VALUE} is not a supported team role.',
      },
      default: 'MEMBER',
    },

    // When the student joined the team
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a student can only be in a team once (no duplicate memberships)
teamMemberSchema.index({ teamId: 1, studentId: 1 }, { unique: true });

// Validation: Ensure student is actually a student role
teamMemberSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('studentId')) {
    const User = this.model('User');
    const user = await User.findById(this.studentId).select('role');
    if (!user || user.role !== 'Student') {
      return next(new Error('Only students can be team members.'));
    }
  }
  next();
});

// Validation: Ensure only one LEADER per team
teamMemberSchema.pre('save', async function (next) {
  if (this.role === 'LEADER' && this.isNew) {
    const existingLeader = await this.model('TeamMember').findOne({
      teamId: this.teamId,
      role: 'LEADER',
      _id: { $ne: this._id } // Exclude current doc if updating
    });
    if (existingLeader) {
      return next(new Error('A team can only have one leader.'));
    }
  }
  next();
});

// Index for querying all members of a team
teamMemberSchema.index({ teamId: 1, joinedAt: 1 });

module.exports = model('TeamMember', teamMemberSchema);