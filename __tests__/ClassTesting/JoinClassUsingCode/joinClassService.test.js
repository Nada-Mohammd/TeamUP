// __tests__/services/class.service.join.test.js
const classService = require("../../../src/services/class.service");

// Mock models
jest.mock("../../../src/models/Class");
jest.mock("../../../src/models/ClassProfile");

const Class = require("../../../src/models/Class");
const ClassProfile = require("../../../src/models/ClassProfile");

describe("classService.joinClassByCode", () => {
  const mockClassCode = "ABC123";
  const mockUserId = "60a1b2c3d4e5f67890123457";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should join class successfully when code is valid and user is not a member", async () => {
    // Arrange
    const mockClassDoc = {
      _id: "60a1b2c3d4e5f67890123456",
      course_name: "Web Development",
      course_code: "CS450",
    };

    Class.findOne.mockResolvedValue(mockClassDoc);
    ClassProfile.findOne.mockResolvedValue(null); // not a member
    ClassProfile.create.mockResolvedValue({
      classId: mockClassDoc._id,
      userId: mockUserId,
      classRole: "member",
    });

    // Act
    const result = await classService.joinClassByCode(
      mockClassCode,
      mockUserId
    );

    // Assert
    expect(Class.findOne).toHaveBeenCalledWith({ class_code: mockClassCode });
    expect(ClassProfile.findOne).toHaveBeenCalledWith({
      classId: mockClassDoc._id,
      userId: mockUserId,
    });
    expect(ClassProfile.create).toHaveBeenCalledWith({
      classId: mockClassDoc._id,
      userId: mockUserId,
      classRole: "member",
    });
    expect(result).toEqual({
      _id: mockClassDoc._id,
      course_name: "Web Development",
      course_code: "CS450",
    });
  });

  test("should throw error if class code is empty", async () => {
    await expect(classService.joinClassByCode("", mockUserId)).rejects.toThrow(
      "Please enter a workspace code."
    );

    await expect(
      classService.joinClassByCode(null, mockUserId)
    ).rejects.toThrow("Please enter a workspace code.");

    await expect(
      classService.joinClassByCode(undefined, mockUserId)
    ).rejects.toThrow("Please enter a workspace code.");
  });

  test("should throw error if class code is invalid (class not found)", async () => {
    Class.findOne.mockResolvedValue(null);

    await expect(
      classService.joinClassByCode("INVALID", mockUserId)
    ).rejects.toThrow(
      "Invalid class code. Please check the code and try again."
    );
  });

  test("should throw error if user is already a member", async () => {
    const mockClassDoc = { _id: "60a1b2c3d4e5f67890123456" };
    Class.findOne.mockResolvedValue(mockClassDoc);
    ClassProfile.findOne.mockResolvedValue({
      // already a member
      classId: mockClassDoc._id,
      userId: mockUserId,
    });

    await expect(
      classService.joinClassByCode(mockClassCode, mockUserId)
    ).rejects.toThrow("You are already a member of this workspace.");
  });
});
