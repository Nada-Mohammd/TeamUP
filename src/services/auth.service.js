// services/authService.js
const User = require("../models/User");
const axios = require("axios");

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

const googleAuth = async ({ role, first_name, last_name, username, token }) => {
    if (!token) throw { status: 400, message: "Google token required" };
    
    let googleResponse;
    try {
      googleResponse = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
      );
      console.log(googleResponse.data);
    } catch (err) {
      throw { status: 401, message: "Invalid or expired Google token" };
    }

    const { email, sub: googleId, email_verified } = googleResponse.data;
    if (!email || !email_verified) throw { status: 400, message: "Google token invalid" };

    let user = await User.findOne({ email });

    if (user) {
      // set account, attach googleId if not set
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
      return { user, statusCode: 200 };
    }

    // New account (register)
    if (!role || !first_name || !last_name || !username) {
      throw { status: 400, message: "First name, last name, username and role required" };
    }

    if (role === "Student" && !/^[0-9]+@stud\.fci-cu\.edu\.eg$/.test(email)) {
      throw { status: 400, message: "Student must use a college email" };
    }

    // Create new user
    user = await User.create({
      email,
      first_name,
      last_name,
      username,
      role,
      googleId,
      password: null,
    });

    return { user, statusCode: 201 };
};

module.exports = {
  registerUser,
  googleAuth,
};
