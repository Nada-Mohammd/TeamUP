// __tests__/controllers/class.controller.delete.test.js
const classController = require("../../../src/controllers/class.controller");
const classService = require("../../../src/services/class.service");

// Mock service
jest.mock("../../../src/services/class.service");
describe("classController.deleteClass", () => {
  const mockReq = {
    params: { classId: "60a1b2c3d4e5f67890123456" },
    user: { id: "60a1b2c3d4e5f67890123457" },
  };

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return 200 and success message on successful deletion", async () => {
    const mockDeletedClass = {
      _id: "60a1b2c3d4e5f67890123456",
      course_name: "Test Course",
    };

    classService.deleteClass.mockResolvedValue(mockDeletedClass);

    await classController.deleteClass(mockReq, mockRes);

    expect(classService.deleteClass).toHaveBeenCalledWith(
      "60a1b2c3d4e5f67890123456",
      "60a1b2c3d4e5f67890123457"
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Class 'Test Course' has been deleted.",
    });
  });

  test("should return 400 with error message on service error", async () => {
    const errorMessage = "You do not have permission to delete this class.";
    classService.deleteClass.mockRejectedValue(new Error(errorMessage));

    await classController.deleteClass(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });
});
