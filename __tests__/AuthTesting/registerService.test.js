const authService = require("../../src/services/auth.service");
const User = require("../../src/models/User");

// Mock the entire User model
jest.mock("../../src/models/User");

describe("authService.registerUser", () => {
  const validUserData = {
    first_name: "Ali",
    last_name: "Khan",
    email: "ali@example.com",
    username: "alikhan",
    password: "SecurePass123!",
    role: "user",
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should create a new user when data is valid", async () => {
    User.findOne.mockResolvedValue(null); // no duplicate
    const mockSavedUser = {
      ...validUserData,
      _id: "12345",
      password: "hashed...",
    };
    User.create.mockResolvedValue(mockSavedUser);

    const result = await authService.registerUser(validUserData);

    expect(User.findOne).toHaveBeenCalledWith({
      $or: [
        { email: validUserData.email },
        { username: validUserData.username },
      ],
    });
    expect(User.create).toHaveBeenCalledWith(validUserData);
    expect(result).toEqual(
      expect.objectContaining({
        first_name: "Ali",
        last_name: "Khan",
        email: "ali@example.com",
        username: "alikhan",
        role: "user",
      })
    );
    // expect(result.password).toBeUndefined(); // should be stripped
  });

  test("should throw error if email already exists", async () => {
    const existingUser = { email: "ali@example.com", username: "otheruser" };
    User.findOne.mockResolvedValue(existingUser);

    await expect(authService.registerUser(validUserData)).rejects.toThrow(
      "This email is already in use."
    );
  });

  test("should throw error if username already exists", async () => {
    const existingUser = { email: "other@example.com", username: "alikhan" };
    User.findOne.mockResolvedValue(existingUser);

    await expect(authService.registerUser(validUserData)).rejects.toThrow(
      "This username is already in use."
    );
  });

  //   test('should default role to "user" if not provided', async () => {
  //     const userDataWithoutRole = { ...validUserData };
  //     delete userDataWithoutRole.role;

  //     User.findOne.mockResolvedValue(null);
  //     const mockSavedUser = { ...userDataWithoutRole, role: "user", _id: "123" };
  //     User.create.mockResolvedValue(mockSavedUser);

  //     const result = await authService.registerUser(userDataWithoutRole);
  //     expect(result.role).toBe("user");
  //   });
});
