const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const passwordResetSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      default: null,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    sessionId: {
      type: String,
      default: null,
      select: false,
      index: true,
    },
    sessionExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    isConsumed: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = model("PasswordResetSession", passwordResetSessionSchema);
