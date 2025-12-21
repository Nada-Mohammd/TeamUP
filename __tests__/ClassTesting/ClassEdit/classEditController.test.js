// __tests__/controllers/class.controller.test.js
const classController = require("../../../src/controllers/class.controller");
const classService = require("../../../src/services/class.service");

// Mock service
jest.mock("../../../src/services/class.service");
describe("classController.editClass", () => {
  const mockReq = {
    params: { classId: "60a1b2c3d4e5f67890123456" },
    user: { id: "60a1b2c3d4e5f67890123457" },
    body: {
      course_name: "Updated Course",
      course_code: "UC101",
      year: 2025,
      course_plan: "New plan",
      class_color: "#FF5733",
    },
  };

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return 200 and success message on successful update", async () => {
    const mockUpdatedClass = {
      course_name: "Updated Course",
      course_code: "UC101",
      year: 2025,
      course_plan: "New plan",
      class_code: "OLD123",
      class_color: "#FF5733",
    };

    classService.editClass.mockResolvedValue(mockUpdatedClass);

    await classController.editClass(mockReq, mockRes);

    expect(classService.editClass).toHaveBeenCalledWith(
      "60a1b2c3d4e5f67890123456",
      "60a1b2c3d4e5f67890123457",
      mockReq.body
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Class updated successfully",
      data: mockUpdatedClass,
    });
  });

  test("should return 400 with error message on service error", async () => {
    const errorMessage = "You do not have permission to edit this class.";
    classService.editClass.mockRejectedValue(new Error(errorMessage));

    await classController.editClass(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});
