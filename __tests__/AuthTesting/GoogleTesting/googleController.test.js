const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");
const { google } = require(".../../../src/controllers/auth.controller");
const { googleAuth } = require("../../../src/services/auth.service");

// Mock the service so controller never touches DB
jest.mock("/src/services/auth.service");

// Mock createSendToken utility that normally sets cookies and JWT
jest.mock("/src/utils/authUtils.js", () => ({
  createSendToken: jest.fn((user, statusCode, req, res) =>
    res.status(statusCode).json({ user: user.email })
  ),
}));

const app = express();
app.use(bodyParser.json());
app.post("/api/auth/google", google);

describe("Google Controller", () => {
  it("returns user if service resolves", async () => {
    // Mock the service response
    googleAuth.mockResolvedValue({
      user: { email: "test@example.com" }, // fake email
      statusCode: 200,
    });

    const res = await request(app)
      .post("/api/auth/google")
      .send({ token: "token" }); // fake token

    expect(res.status).toBe(200);
    expect(res.body.user).toBe("test@example.com");
  });

  it("returns error if service rejects", async () => {
    // Mock service rejection
    googleAuth.mockRejectedValue({
      status: 400,
      message: "Invalid token",
    });

    const res = await request(app)
      .post("/api/auth/google")
      .send({ token: "token" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid token");
  });
});
