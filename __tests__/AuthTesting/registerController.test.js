// __tests__/controllers/authController.test.js
const authController = require("../../src/controllers/auth.controller");
const authService = require("../../src/services/auth.service");

// Mock authService
jest.mock("../../src/services/auth.service");

// Mock createSendToken (since it has side effects: cookies, JWT)
const mockCreateSendToken = jest.fn();
// Replace the real createSendToken with mock
jest.mock("../../src/utils/authUtils", () => ({
  createSendToken: (...args) => mockCreateSendToken(...args),
}));

describe("authController.register", () => {
  const mockReq = {
    body: {
      first_name: "Ali",
      last_name: "Khan",
      email: "ali@example.com",
      username: "alikhan",
      password: "SecurePass123!",
      role: "user",
    },
  };

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    cookie: jest.fn(),
  };

  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should call registerUser and createSendToken on valid input", async () => {
    const mockUser = { ...mockReq.body, _id: "123", password: undefined };
    authService.registerUser.mockResolvedValue(mockUser);

    await authController.register(mockReq, mockRes, mockNext);

    expect(authService.registerUser).toHaveBeenCalledWith({
      first_name: "Ali",
      last_name: "Khan",
      email: "ali@example.com",
      username: "alikhan",
      password: "SecurePass123!",
      role: "user",
    });
    expect(mockCreateSendToken).toHaveBeenCalledWith(
      mockUser,
      201,
      mockReq,
      mockRes,
      undefined // rememberMe not provided
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("should return 400 if firstName is missing", async () => {
    const req = { body: { ...mockReq.body, first_name: "" } };

    await authController.register(req, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: "fail",
      message: "Please provide first name and last name.",
    });
    expect(authService.registerUser).not.toHaveBeenCalled();
  });

  test("should return 400 if email is missing", async () => {
    const req = { body: { ...mockReq.body, email: undefined } };

    await authController.register(req, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: "fail",
      message: "Please provide an email.",
    });
  });

  test("should return 400 if role is missing", async () => {
    const req = { body: { ...mockReq.body, role: undefined } };

    await authController.register(req, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: "fail",
      message: "Please specify a role.",
    });
  });

  test("should handle duplicate email error (409)", async () => {
    authService.registerUser.mockRejectedValue(
      new Error("This email is already in use.")
    );

    await authController.register(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: "fail",
      message: "This email is already in use.",
    });
  });

  test("should call next() for unexpected errors", async () => {
    const unexpectedError = new Error("DB connection failed");
    authService.registerUser.mockRejectedValue(unexpectedError);

    await authController.register(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(unexpectedError);
  });
});
