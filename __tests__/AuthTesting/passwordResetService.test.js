jest.mock("../../src/models/User");
jest.mock("../../src/models/PasswordResetSession");
jest.mock("../../src/services/email.service", () => ({
  sendPasswordResetOtpEmail: jest.fn(),
}));
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../../src/models/User");
const PasswordResetSession = require("../../src/models/PasswordResetSession");
const {
  sendPasswordResetOtpEmail,
} = require("../../src/services/email.service");

const {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithVerificationToken,
} = require("../../src/services/auth.service");

describe("Password Reset Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requestPasswordResetOtp does nothing when user is not found", async () => {
    User.findOne.mockResolvedValue(null);

    await requestPasswordResetOtp("missing@example.com");

    expect(PasswordResetSession.create).not.toHaveBeenCalled();
    expect(sendPasswordResetOtpEmail).not.toHaveBeenCalled();
  });

  it("requestPasswordResetOtp respects resend cooldown", async () => {
    const user = { _id: "u1", email: "user@example.com", first_name: "User" };
    User.findOne.mockResolvedValue(user);

    const activeSession = {
      createdAt: new Date(),
      lockedUntil: null,
    };

    PasswordResetSession.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(activeSession),
      }),
    });

    await requestPasswordResetOtp("user@example.com");

    expect(PasswordResetSession.create).not.toHaveBeenCalled();
    expect(sendPasswordResetOtpEmail).not.toHaveBeenCalled();
  });

  it("verifyPasswordResetOtp throws when session is locked", async () => {
    User.findOne.mockResolvedValue({ _id: "u1", email: "user@example.com" });

    PasswordResetSession.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue({
          lockedUntil: new Date(Date.now() + 60_000),
        }),
      }),
    });

    await expect(
      verifyPasswordResetOtp({ email: "user@example.com", otp: "123456" }),
    ).rejects.toThrow("Too many invalid attempts. Try again later.");
  });

  it("verifyPasswordResetOtp returns verification token for valid otp", async () => {
    const user = { _id: "u1", email: "user@example.com" };
    User.findOne.mockResolvedValue(user);

    const otp = "123456";
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const resetSession = {
      otpHash,
      otpExpiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      save: jest.fn().mockResolvedValue(),
    };

    PasswordResetSession.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(resetSession),
      }),
    });

    jwt.sign.mockReturnValue("verification-token");

    const result = await verifyPasswordResetOtp({
      email: "user@example.com",
      otp,
    });

    expect(result).toBe("verification-token");
    expect(resetSession.save).toHaveBeenCalled();
  });

  it("resetPasswordWithVerificationToken updates password and consumes session", async () => {
    jwt.verify.mockReturnValue({
      id: "u1",
      email: "user@example.com",
      purpose: "password-reset",
      sid: "sid-1",
    });

    const userDoc = {
      _id: "u1",
      email: "user@example.com",
      password: "old",
      save: jest.fn().mockResolvedValue(),
    };

    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(userDoc),
    });

    const resetSessionDoc = {
      isConsumed: false,
      expiresAt: null,
      save: jest.fn().mockResolvedValue(),
    };

    PasswordResetSession.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(resetSessionDoc),
    });
    PasswordResetSession.deleteMany.mockResolvedValue();

    await resetPasswordWithVerificationToken({
      email: "user@example.com",
      newPassword: "NewPassword123",
      verificationToken: "token",
    });

    expect(userDoc.password).toBe("NewPassword123");
    expect(userDoc.save).toHaveBeenCalled();
    expect(resetSessionDoc.isConsumed).toBe(true);
    expect(resetSessionDoc.save).toHaveBeenCalled();
    expect(PasswordResetSession.deleteMany).toHaveBeenCalled();
  });
});
