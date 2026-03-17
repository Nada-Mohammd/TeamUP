// services/authService.js
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const PasswordResetSession = require("../models/PasswordResetSession");
const axios = require("axios");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sendPasswordResetOtpEmail } = require("./email.service");

const RESET_OTP_TTL_MS = Number(process.env.RESET_OTP_TTL_MS || 10 * 60 * 1000);
const RESET_OTP_MAX_ATTEMPTS = Number(process.env.RESET_OTP_MAX_ATTEMPTS || 5);
const RESET_OTP_LOCK_MS = Number(
  process.env.RESET_OTP_LOCK_MS || 10 * 60 * 1000,
);
const RESET_OTP_RESEND_COOLDOWN_MS = Number(
  process.env.RESET_OTP_RESEND_COOLDOWN_MS || 60 * 1000,
);

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

  if (role === "Student") {
    const profile = await StudentProfile.create({
      user_id: newUser._id,
      username,
      first_name,
      last_name,
    });
    newUser.profile_id = profile._id;
    await newUser.save();
  }

  return newUser;
};

const googleAuth = async ({ role, first_name, last_name, username, token }) => {
  if (!token) throw { status: 400, message: "Google token required" };

  let googleResponse;
  try {
    googleResponse = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`,
    );
    console.log(googleResponse.data);
  } catch (err) {
    throw { status: 401, message: "Invalid or expired Google token" };
  }

  const { email, sub: googleId, email_verified } = googleResponse.data;
  if (!email || !email_verified)
    throw { status: 400, message: "Google token invalid" };

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
    throw {
      status: 400,
      message: "First name, last name, username and role required",
    };
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

  if (role === "Student") {
    const profile = await StudentProfile.create({
      user_id: user._id,
      username,
      first_name,
      last_name,
    });
    user.profile_id = profile._id;
    await user.save();
  }

  return { user, statusCode: 201 };
};

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

const signResetVerificationToken = (userId, email, sessionId) => {
  const secret =
    process.env.JWT_RESET_SECRET ||
    process.env.JWT_SECRET ||
    process.env.DEFAULT_SECRET;

  return jwt.sign(
    {
      id: userId,
      email,
      purpose: "password-reset",
      sid: sessionId,
    },
    secret,
    { expiresIn: process.env.RESET_TOKEN_EXPIRES_IN || "10m" },
  );
};

const verifyResetVerificationToken = (token) => {
  const secret =
    process.env.JWT_RESET_SECRET ||
    process.env.JWT_SECRET ||
    process.env.DEFAULT_SECRET;

  const decoded = jwt.verify(token, secret);
  if (decoded.purpose !== "password-reset") {
    throw new Error("Invalid reset token purpose.");
  }

  return decoded;
};

const requestPasswordResetOtp = async (email) => {
  const user = await User.findOne({ email });

  // Keep response generic to avoid account enumeration.
  if (!user) {
    return;
  }

  const activeSession = await PasswordResetSession.findOne({
    userId: user._id,
    isConsumed: false,
    isVerified: false,
  })
    .select("+lockedUntil")
    .sort({ createdAt: -1 });

  if (
    activeSession?.lockedUntil &&
    activeSession.lockedUntil.getTime() > Date.now()
  ) {
    return;
  }

  if (
    activeSession?.createdAt &&
    Date.now() - new Date(activeSession.createdAt).getTime() <
      RESET_OTP_RESEND_COOLDOWN_MS
  ) {
    return;
  }

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + RESET_OTP_TTL_MS);

  await PasswordResetSession.deleteMany({
    userId: user._id,
    isConsumed: false,
  });

  await PasswordResetSession.create({
    userId: user._id,
    email: user.email,
    otpHash: hashOtp(otp),
    otpExpiresAt,
    expiresAt: otpExpiresAt,
  });

  await sendPasswordResetOtpEmail(user.email, otp, user.first_name);
};

const verifyPasswordResetOtp = async ({ email, otp }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Invalid or expired OTP.");
  }

  const resetSession = await PasswordResetSession.findOne({
    userId: user._id,
    isConsumed: false,
    isVerified: false,
  })
    .select("+otpHash +otpExpiresAt +lockedUntil")
    .sort({ createdAt: -1 });

  if (
    resetSession?.lockedUntil &&
    resetSession.lockedUntil.getTime() > Date.now()
  ) {
    throw new Error("Too many invalid attempts. Try again later.");
  }

  if (
    !resetSession ||
    !resetSession.otpHash ||
    !resetSession.otpExpiresAt ||
    resetSession.otpExpiresAt.getTime() < Date.now()
  ) {
    throw new Error("Invalid or expired OTP.");
  }

  const submittedOtpHash = hashOtp(otp);
  if (submittedOtpHash !== resetSession.otpHash) {
    resetSession.attemptCount += 1;

    if (resetSession.attemptCount >= RESET_OTP_MAX_ATTEMPTS) {
      resetSession.lockedUntil = new Date(Date.now() + RESET_OTP_LOCK_MS);
    }

    await resetSession.save();
    throw new Error("Invalid or expired OTP.");
  }

  const sessionId = crypto.randomBytes(32).toString("hex");
  const sessionExpiresAt = new Date(Date.now() + RESET_OTP_TTL_MS);

  resetSession.isVerified = true;
  resetSession.sessionId = sessionId;
  resetSession.sessionExpiresAt = sessionExpiresAt;
  resetSession.attemptCount = 0;
  resetSession.lockedUntil = null;
  resetSession.otpHash = null;
  resetSession.otpExpiresAt = null;
  resetSession.expiresAt = sessionExpiresAt;

  await resetSession.save();

  return signResetVerificationToken(user._id, user.email, sessionId);
};

const resetPasswordWithVerificationToken = async ({
  email,
  newPassword,
  verificationToken,
}) => {
  const decoded = verifyResetVerificationToken(verificationToken);

  if (decoded.email !== email) {
    throw new Error("Token/email mismatch.");
  }

  const user = await User.findById(decoded.id).select("+password");

  if (!user || user.email !== email) {
    throw new Error("Invalid reset request.");
  }

  const resetSession = await PasswordResetSession.findOne({
    userId: user._id,
    sessionId: decoded.sid,
    isVerified: true,
    isConsumed: false,
    sessionExpiresAt: { $gt: new Date() },
  }).select("+sessionId +sessionExpiresAt");

  if (!resetSession) {
    throw new Error("Reset session expired. Verify OTP again.");
  }

  user.password = newPassword;
  await user.save();

  resetSession.isConsumed = true;
  resetSession.expiresAt = new Date(Date.now() + 60 * 1000);
  await resetSession.save();

  await PasswordResetSession.deleteMany({
    userId: user._id,
    isConsumed: false,
  });
};

module.exports = {
  registerUser,
  googleAuth,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithVerificationToken,
};
