const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema, model } = mongoose;

const linkSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Link name is required."],
      trim: true,
      // e.g., 'GitHub', 'LinkedIn', 'Portfolio'
    },
    url: {
      type: String,
      required: [true, "URL is required."],
      trim: true,
      validate: {
        validator: function (v) {
          return /^(https?:\/\/)[\w.-]+(\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/.test(
            v,
          );
        },
        message: "Please provide a valid URL.",
      },
    },
  },
  { _id: false }, // No separate _id for sub-documents
);

const ratingSchema = new Schema(
  {
    raterName: {
      type: String,
      required: [true, "Rater name is required."],
      trim: true,
    },
    raterUsername: {
      type: String,
      required: [true, "Rater username is required."],
      trim: true,
      lowercase: true,
    },
    stars: {
      type: Number,
      required: [true, "Star rating is required."],
      min: [1, "Rating must be at least 1."],
      max: [5, "Rating cannot exceed 5."],
    },
    comment: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, "Comment cannot exceed 500 characters."],
    },
  },
  {
    _id: false,
    timestamps: { createdAt: true, updatedAt: false }, // track when rating was given
  },
);

// --- Main Schema ---

const studentProfileSchema = new Schema(
  {
    // Back-reference to the owning User document
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One profile per user
    },

    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    gpa: {
      type: Number,
      min: [0.0, "GPA cannot be negative."],
      max: [4.0, "GPA cannot exceed 4.0."],
      default: null,
    },

    availability: {
      type: [String],
      enum: {
        values: ["morning", "evening", "night", "all day"],
        message: "{VALUE} is not a valid availability slot.",
      },
      default: [],
    },

    skills: {
      type: [String],
      default: [],
    },

    links: {
      type: [linkSchema],
      default: [],
    },

    // CV stored as a path or a URL (e.g., cloud storage key or local path)
    cv: {
      filename: { type: String, default: null }, // original file name shown to user
      storagePath: { type: String, default: null }, // S3 key, GridFS id, or local path
      uploadedAt: { type: Date, default: null },
    },

    profilePicture: {
      filename: { type: String, default: null },
      storagePath: { type: String, default: null },
      uploadedAt: { type: Date, default: null },
    },

    ratings: {
      type: [ratingSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // fullName will appear in res.json(profile)
    toObject: { virtuals: true },
  },
);

// --- Virtuals ---

// Full name convenience virtual
studentProfileSchema.virtual("fullName").get(function () {
  return `${this.first_name} ${this.last_name}`;
});

const StudentProfile = model("StudentProfile", studentProfileSchema);
module.exports = StudentProfile;
