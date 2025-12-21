// __tests__/services/class.service.delete.test.js
const classService = require("../../../src/services/class.service");

// Mock models
jest.mock("../../../src/models/Class");
jest.mock("../../../src/models/ClassProfile");
jest.mock("../../../src/models/User");

const Class = require("../../../src/models/Class");
const ClassProfile = require("../../../src/models/ClassProfile");
const User = require("../../../src/models/User");

describe("classService.deleteClass", () => {
  const mockClassId = "60a1b2c3d4e5f67890123456";
  const mockInstructorId = "60a1b2c3d4e5f67890123457";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should delete class and related data successfully", async () => {
    // Arrange
    const mockClassDoc = {
      _id: mockClassId,
      course_name: "Test Course",
    };

    Class.findById.mockResolvedValue(mockClassDoc);
    User.findById.mockResolvedValue({
      _id: mockInstructorId,
      role: "Instructor",
    });
    ClassProfile.findOne.mockResolvedValue({
      classId: mockClassId,
      userId: mockInstructorId,
      classRole: "admin",
    });
    ClassProfile.deleteMany.mockResolvedValue({ deletedCount: 3 });
    Class.findByIdAndDelete.mockResolvedValue(mockClassDoc);

    // Act
    const result = await classService.deleteClass(
      mockClassId,
      mockInstructorId
    );

    // Assert
    expect(Class.findById).toHaveBeenCalledWith(mockClassId);
    expect(User.findById).toHaveBeenCalledWith(mockInstructorId);
    expect(ClassProfile.findOne).toHaveBeenCalledWith({
      classId: mockClassId,
      userId: mockInstructorId,
      classRole: "admin",
    });
    expect(ClassProfile.deleteMany).toHaveBeenCalledWith({
      classId: mockClassId,
    });
    expect(Class.findByIdAndDelete).toHaveBeenCalledWith(mockClassId);
    expect(result).toEqual({
      _id: mockClassId,
      course_name: "Test Course",
    });
  });

  test("should throw error if class not found", async () => {
    Class.findById.mockResolvedValue(null);

    await expect(
      classService.deleteClass(mockClassId, mockInstructorId)
    ).rejects.toThrow("Class not found.");
  });

  test("should throw error if user is not an instructor", async () => {
    Class.findById.mockResolvedValue({ _id: mockClassId });
    User.findById.mockResolvedValue({ role: "Student" });

    await expect(
      classService.deleteClass(mockClassId, mockInstructorId)
    ).rejects.toThrow("Only instructors can delete classes.");
  });

  test("should throw error if user is not admin in class", async () => {
    Class.findById.mockResolvedValue({ _id: mockClassId });
    User.findById.mockResolvedValue({
      _id: mockInstructorId,
      role: "Instructor",
    });
    ClassProfile.findOne.mockResolvedValue(null);

    await expect(
      classService.deleteClass(mockClassId, mockInstructorId)
    ).rejects.toThrow("You do not have permission to delete this class.");
  });
});
