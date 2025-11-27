const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { registerUser } = require("../services/auth.service");
const { createSendToken } = require("../utils/authUtils");

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      email,
      username,
      password,
      role,
      rememberMe,
    } = req.body;

    // Minimal validation (you can move this to middleware later)
    if (!first_name || !last_name) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide first name and last name.",
      });
    }
    if (!email) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide an email.",
      });
    }
    if (!username || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide username and password.",
      });
    }
    if (!role) {
      return res.status(400).json({
        status: "fail",
        message: "Please specify a role.",
      });
    }

    // Delegate business logic to service
    const newUser = await registerUser({
      first_name,
      last_name,
      email,
      username,
      password,
      role,
    });

    // Issue token and respond
    createSendToken(newUser, 201, req, res, rememberMe);
  } catch (error) {
    // Handle known errors
    if (error.message.includes("already in use")) {
      return res.status(409).json({
        status: "fail",
        message: error.message,
      });
    }

    // Pass unexpected errors to global error handler
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    console.log("\n--- NEW LOGIN ATTEMPT ---");
    console.log("Email received from Postman:", req.body.email);
    const { email, password, rememberMe } = req.body; // 'rememberMe' is a boolean flag
    if (!email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide email and password.",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid email ",
      });
    }
    if (!(await user.comparePassword(password))) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid password ",
      });
    }
    createSendToken(user, 200, req, res, rememberMe);
  } catch (error) {
    next(error);
  }
};
module.exports = {
  login,
  register,
};
