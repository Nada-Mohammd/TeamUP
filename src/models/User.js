// This is the core model for any user, whether an instructor or a student.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    // --- user_id has been removed ---
    // We will use the default Mongoose `_id` as the unique Primary Key.

    first_name: {
      type: String,
      required: [true, 'First name is required.'],
      trim: true,
    },
    last_name: {
      type: String,
      required: [true, 'Last name is required.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (email) {
          // If the user is a student, enforce the specific university email format.
          if (this.role === 'Student') {
            // Regex: must be one or more digits, followed by the exact domain.
            return /^[0-9]+@stud\.fci-cu\.edu\.eg$/.test(email);
          }

          // If the user is an 'Instructor' (or any other role),
          // we'll just use the general email validation.
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
        },
        // Provide a dynamic error message
        message: function (props) {
          // 'this' refers to the document being validated
          if (this.role === 'Student') {
            return `Student email must be in the format: e.g., 20221175@stud.fci-cu.edu.eg`;
          }
          return `Please provide a valid email address.`;
        },
      },
    },
    username: {
      type: String,
      required: [true, 'Username is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long.'],
    },
    password: {
      type: String,
      // Password is only required if googleId is not present
      required: function () { 
        return !this.googleId;
      },
      minlength: [6, 'Password must be at least 6 characters long.'],
      select: false, // Automatically hide password from query results
    },
    role: {
      type: String,
      required: true,
      enum: {
        values: ['Instructor', 'Student'],
        message: '{VALUE} is not a supported role.',
      },
      default: 'Student',
    },
    // The profile_id FK from your ERD.
    profile_id: {
      // Changed from Number to ObjectId, which is the standard for linking documents.
      type: Schema.Types.ObjectId,
      // This tells Mongoose which model this ID refers to.
      // You can create a 'StudentProfile' model later.
      ref: 'StudentProfile',
      // We remove 'required' so you can create a User without a Profile for now.
      default: null,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple documents to be null, but non-null values must be unique
      
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// --- Middleware ---

// Hash password before saving a new user
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new) and is not a Google login
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// --- Methods ---

// Instance method to compare candidate password with hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  // If user has no password (e.g., Google login), return false
  if (!this.password) {
    return false;
  }
  
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw err;
  }
};

const User = model('User', userSchema);
module.exports = User;

