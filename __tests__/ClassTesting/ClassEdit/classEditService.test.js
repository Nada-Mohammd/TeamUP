// __tests__/services/class.service.test.js
const classService = require("../../../src/services/class.service");

// Mock models
jest.mock("../../../src/models/Class");
jest.mock("../../../src/models/ClassProfile");
jest.mock("../../../src/models/User");

const Class = require("../../../src/models/Class");
const ClassProfile = require("../../../src/models/ClassProfile");
const User = require("../../../src/models/User");

describe("classService.editClass", () => {
  const mockClassId = "60a1b2c3d4e5f67890123456";
  const mockInstructorId = "60a1b2c3d4e5f67890123457";
  const mockUpdateData = {
    course_name: "Updated Course",
    course_code: "UC101",
    year: 2025,
    course_plan: "New plan",
    class_color: "#FF5733",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should update class successfully when all validations pass", async () => {
    // Arrange
    const mockClassDoc = {
      _id: mockClassId,
      course_name: "Old Course",
      course_code: "OC101",
      year: 2024,
      course_plan: "Old plan",
      class_code: "OLD123",
      class_color: "#000000",
      save: jest.fn().mockReturnThis(),
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
    Class.findOne.mockResolvedValue(null); // no duplicates

    // Act
    const result = await classService.editClass(
      mockClassId,
      mockInstructorId,
      mockUpdateData
    );

    // Assert
    expect(Class.findById).toHaveBeenCalledWith(mockClassId);
    expect(User.findById).toHaveBeenCalledWith(mockInstructorId);
    expect(ClassProfile.findOne).toHaveBeenCalledWith({
      classId: mockClassId,
      userId: mockInstructorId,
      classRole: "admin",
    });
    expect(Class.findOne).toHaveBeenCalledTimes(2); // name + code checks
    expect(mockClassDoc.save).toHaveBeenCalled();
    expect(result).toEqual({
      course_name: "Updated Course",
      course_code: "UC101",
      year: 2025,
      course_plan: "New plan",
      class_code: "OLD123",
      class_color: "#FF5733",
      createdAt: undefined,
      updatedAt: undefined,
    });
  });

  test("should throw error if class not found", async () => {
    Class.findById.mockResolvedValue(null);

    await expect(
      classService.editClass(mockClassId, mockInstructorId, mockUpdateData)
    ).rejects.toThrow("Class not found.");
  });

  test("should throw error if user is not an instructor", async () => {
    Class.findById.mockResolvedValue({ _id: mockClassId });
    User.findById.mockResolvedValue({ role: "Student" });

    await expect(
      classService.editClass(mockClassId, mockInstructorId, mockUpdateData)
    ).rejects.toThrow("Only instructors can edit classes.");
  });

  test("should throw error if user is not admin in class", async () => {
    Class.findById.mockResolvedValue({ _id: mockClassId });
    User.findById.mockResolvedValue({
      _id: mockInstructorId,
      role: "Instructor",
    });
    ClassProfile.findOne.mockResolvedValue(null);

    await expect(
      classService.editClass(mockClassId, mockInstructorId, mockUpdateData)
    ).rejects.toThrow("You do not have permission to edit this class.");
  });

  test("should throw error if course_name is empty", async () => {
    // Arrange: Set up mocks to PASS permission checks
    Class.findById.mockResolvedValue({ _id: mockClassId });
    User.findById.mockResolvedValue({
      _id: mockInstructorId,
      role: "Instructor",
    });
    ClassProfile.findOne.mockResolvedValue({
      classId: mockClassId,
      userId: mockInstructorId,
      classRole: "admin",
    });

    const invalidData = { ...mockUpdateData, course_name: "" };

    // Act & Assert
    await expect(
      classService.editClass(mockClassId, mockInstructorId, invalidData)
    ).rejects.toThrow("Course name cannot be empty.");
  });

  test("should throw error if duplicate course name exists", async () => {
    Class.findById.mockResolvedValue({ _id: mockClassId });
    User.findById.mockResolvedValue({
      _id: mockInstructorId,
      role: "Instructor",
    });
    ClassProfile.findOne.mockResolvedValue({ classRole: "admin" });
    Class.findOne.mockResolvedValueOnce({ _id: "otherId" }); // duplicate name

    await expect(
      classService.editClass(mockClassId, mockInstructorId, mockUpdateData)
    ).rejects.toThrow("A class with this name already exists.");
  });
});
