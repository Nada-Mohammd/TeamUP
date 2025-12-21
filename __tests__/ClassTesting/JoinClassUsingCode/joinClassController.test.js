// __tests__/controllers/class.controller.join.test.js
const classController = require("../../../src/controllers/class.controller");
const classService = require("../../../src/services/class.service");

// Mock service
jest.mock("../../../src/services/class.service");
describe("classController.joinClassByCode", () => {
  const mockReq = {
    body: { class_code: "ABC123" },
    user: { id: "60a1b2c3d4e5f67890123457" },
  };

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return 200 and success message on successful join", async () => {
    const mockJoinedClass = {
      _id: "60a1b2c3d4e5f67890123456",
      course_name: "Web Development",
      course_code: "CS450",
    };

    classService.joinClassByCode.mockResolvedValue(mockJoinedClass);

    await classController.joinClassByCode(mockReq, mockRes);

    expect(classService.joinClassByCode).toHaveBeenCalledWith(
      "ABC123",
      "60a1b2c3d4e5f67890123457"
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Welcome to Web Development!",
      data: {
        classId: "60a1b2c3d4e5f67890123456",
        course_name: "Web Development",
        course_code: "CS450",
      },
    });
  });

  test("should return 400 with error message on service error", async () => {
    const errorMessage =
      "Invalid class code. Please check the code and try again.";
    classService.joinClassByCode.mockRejectedValue(new Error(errorMessage));

    await classController.joinClassByCode(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: errorMessage,
    });
  });

  test("should handle empty class code from request", async () => {
    const emptyReq = { ...mockReq, body: { class_code: "" } };
    classService.joinClassByCode.mockRejectedValue(
      new Error("Please enter a workspace code.")
    );

    await classController.joinClassByCode(emptyReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Please enter a workspace code.",
    });
  });
});
