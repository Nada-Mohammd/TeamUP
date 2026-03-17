const request = require("supertest");
const express = require("express");

const {
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} = require("../../src/controllers/auth.controller");

const {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithVerificationToken,
} = require("../../src/services/auth.service");

jest.mock("../../src/services/auth.service", () => ({
  requestPasswordResetOtp: jest.fn(),
  verifyPasswordResetOtp: jest.fn(),
  resetPasswordWithVerificationToken: jest.fn(),
  registerUser: jest.fn(),
  googleAuth: jest.fn(),
}));

jest.mock("../../src/utils/authUtils", () => ({
  createSendToken: jest.fn(),
}));

const app = express();
app.use(express.json());
app.post("/api/auth/forgot-password", forgotPassword);
app.post("/api/auth/verify-reset-otp", verifyResetOtp);
app.post("/api/auth/reset-password", resetPassword);

describe("Password Reset Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forgotPassword returns 400 when email is missing", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Please provide an email.");
  });

  it("forgotPassword returns generic success response", async () => {
    requestPasswordResetOtp.mockResolvedValue();

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "user@example.com" });

    expect(requestPasswordResetOtp).toHaveBeenCalledWith("user@example.com");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      message: "If the email exists, an OTP has been sent.",
    });
  });

  it("verifyResetOtp returns 400 when payload is incomplete", async () => {
    const res = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: "user@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Please provide email and otp.");
  });

  it("verifyResetOtp returns verification token on success", async () => {
    verifyPasswordResetOtp.mockResolvedValue("verification-token");

    const res = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: "user@example.com", otp: "123456" });

    expect(verifyPasswordResetOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      otp: "123456",
    });
    expect(res.status).toBe(200);
    expect(res.body.verificationToken).toBe("verification-token");
  });

  it("verifyResetOtp returns 400 for invalid otp", async () => {
    verifyPasswordResetOtp.mockRejectedValue(
      new Error("Invalid or expired OTP."),
    );

    const res = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: "user@example.com", otp: "000000" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid or expired OTP.");
  });

  it("resetPassword returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ email: "user@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Please provide email, verificationToken, newPassword and confirmPassword.",
    );
  });

  it("resetPassword returns 400 when passwords do not match", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({
      email: "user@example.com",
      newPassword: "Password123",
      confirmPassword: "Password456",
      verificationToken: "token",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Passwords do not match.");
  });

  it("resetPassword returns 200 on success", async () => {
    resetPasswordWithVerificationToken.mockResolvedValue();

    const payload = {
      email: "user@example.com",
      newPassword: "Password123",
      confirmPassword: "Password123",
      verificationToken: "token",
    };

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send(payload);

    expect(resetPasswordWithVerificationToken).toHaveBeenCalledWith({
      email: "user@example.com",
      newPassword: "Password123",
      verificationToken: "token",
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Password reset successful.");
  });

  it("resetPassword returns 400 when service throws", async () => {
    resetPasswordWithVerificationToken.mockRejectedValue(
      new Error("Reset session expired. Verify OTP again."),
    );

    const res = await request(app).post("/api/auth/reset-password").send({
      email: "user@example.com",
      newPassword: "Password123",
      confirmPassword: "Password123",
      verificationToken: "token",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Reset session expired. Verify OTP again.");
  });
});
