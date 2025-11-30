// __tests__/AuthTesting/loginController.test.js

const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");
const { login } = require("../../src/controllers/auth.controller");
const User = require("../../src/models/User");

// Mock User model so controller never touches DB
jest.mock("../../src/models/User");

// Mock createSendToken 
jest.mock("../../src/utils/authUtils", () => ({
  createSendToken: jest.fn((user, statusCode, req, res, rememberMe) => {
    console.log("Mock createSendToken called with user:", user);
    if (!user || !user.email) {
      console.error("User is undefined or missing email!");
      return res.status(500).json({ error: "User is undefined" });
    }
    return res.status(statusCode).json({
      status: "success",
      token: "mocked-jwt-token",
      data: { user: { email: user.email } },
    });
  }),
}));

const app = express();
app.use(bodyParser.json());
app.post("/api/auth/login", login);

describe("Login Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Reset mocks before each test
  });

  it("returns 400 if email or password missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com" }); // Missing password

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Please provide email and password.");
  });

  it("returns 401 if user not found", async () => {
    // Mock User.findOne to return null (user doesn't exist)
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "nonexistent@example.com",
        password: "123456",
        rememberMe: false,
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email ");
  });

  it("returns 401 if password is incorrect", async () => {
    const mockUser = {
      _id: "64e7f0a1c12345",
      email: "20221157@stud.fci-cu.edu.eg",
      password: "hashedPassword",
      comparePassword: jest.fn().mockResolvedValue(false), // Password doesn't match
    };

    // Mock User.findOne to return user with wrong password
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "20221157@stud.fci-cu.edu.eg",
        password: "wrongpassword",
        rememberMe: false,
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid password ");
  });

  it("returns 200 and user on successful login", async () => {
    const mockUser = {
      _id: "64e7f0a1c12345",
      email: "20221157@stud.fci-cu.edu.eg",
      password: "hashedPassword",
      comparePassword: jest.fn().mockResolvedValue(true), // Correct password
    };

    // CRITICAL: Mock the chain User.findOne().select()
    const mockSelect = jest.fn().mockResolvedValue(mockUser);
    const mockFindOne = jest.fn().mockReturnValue({ select: mockSelect });
    User.findOne = mockFindOne;

    console.log("🧪 Test: About to make request");

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "20221157@stud.fci-cu.edu.eg",
        password: "123456",
        rememberMe: false,
      });

    console.log("Response status:", res.status);
    console.log("Response body:", res.body);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.user.email).toBe("20221157@stud.fci-cu.edu.eg");
    expect(res.body.token).toBe("mocked-jwt-token");
  });

  it("returns 200 with rememberMe flag", async () => {
    const mockUser = {
      _id: "64e7f0a1c12345",
      email: "20221157@stud.fci-cu.edu.eg",
      password: "hashedPassword",
      comparePassword: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "20221157@stud.fci-cu.edu.eg",
        password: "123456",
        rememberMe: true, // Test remember me functionality
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
  });
});