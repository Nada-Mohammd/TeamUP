// services/authService.js
const User = require("../models/User");

const registerUser = async (userData) => {
  const {
    first_name,
    last_name,
    email,
    username,
    password,
    role = "user",
  } = userData;

  // Check for existing user by email or username
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    const field = existingUser.email === email ? "email" : "username";
    throw new Error(`This ${field} is already in use.`);
  }

  // Create user → password hashing should happen in User model pre-save hook
  const newUser = await User.create({
    first_name,
    last_name,
    email,
    username,
    password, // plain text → will be hashed by model
    role,
  });

  return newUser;
};

module.exports = {
  registerUser,
};
