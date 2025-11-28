const { googleAuth } = require("../../../src/services/auth.service");
const User = require("../../../src/models/User");
const axios = require("axios");

// Mock external dependencies so real DB and Google API are not called
jest.mock("axios");       // Mocks Google token verification API
jest.mock("../../../src/models/User"); // Mocks Mongoose User model

describe("googleAuth", () => {
  const token = "fake-google-token"; // fake token for testing

  beforeEach(() => {
    jest.clearAllMocks(); // Reset mocks before each test
  });

  it("throws if no token provided", async () => {
    // Test that service rejects if no token is sent
    await expect(googleAuth({})).rejects.toMatchObject({
      status: 400,
      message: "Google token required",
    });
  });

  it("throws if Google token invalid", async () => {
    // Simulate Google API rejecting token
    axios.get.mockRejectedValue(new Error("Invalid token"));

    await expect(googleAuth({ token })).rejects.toMatchObject({
      status: 401,
      message: "Invalid or expired Google token",
    });
  });

  it("returns existing user if found", async () => {
    // Mock axios response from Google API
    axios.get.mockResolvedValue({
      data: { email: "test@example.com", sub: "123", email_verified: true },
    });

    // Mock User.findOne to simulate user already in DB
    const mockUser = { save: jest.fn() }; // fake user object
    User.findOne.mockResolvedValue(mockUser);

    const result = await googleAuth({ token });

    expect(result.user).toBe(mockUser);
    expect(result.statusCode).toBe(200);
  });

  it("creates new user if not found", async () => {
    axios.get.mockResolvedValue({
      data: { email: "20220516@stud.fci-cu.edu.eg", sub: "123", email_verified: true },
    });

    // Simulate no user in DB
    User.findOne.mockResolvedValue(null);

    // Mock User.create to return a fake new user
    User.create.mockResolvedValue({ email: "20220516@stud.fci-cu.edu.eg" });

    const result = await googleAuth({
      token,
      role: "Student",
      first_name: "John",
      last_name: "Doe",
      username: "johndoe",
    });

    // Check that the returned user is the mocked one
    expect(result.user.email).toBe("20220516@stud.fci-cu.edu.eg");
    expect(result.statusCode).toBe(201);
  });

  it("throws if student email domain invalid", async () => {
    axios.get.mockResolvedValue({
      data: { email: "wrong@gmail.com", sub: "123", email_verified: true },
    });

    User.findOne.mockResolvedValue(null); // Simulate new user

    await expect(
      googleAuth({
        token,
        role: "Student",
        first_name: "John",
        last_name: "Doe",
        username: "johndoe",
      })
    ).rejects.toMatchObject({
      status: 400,
      message: "Student must use a college email",
    });
  });
});
