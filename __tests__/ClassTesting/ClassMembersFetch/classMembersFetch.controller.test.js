const classController = require("../../../src/controllers/class.controller");
const classService = require("../../../src/services/class.service");

jest.mock("../../../src/services/class.service");

describe("classController.getClassMembers", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { classId: "class123" },
      user: { id: "user123" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test("should return 200 with admins, instructors, and students", async () => {
    const mockData = {
      admins: [{ _id: "inst1", first_name: "Aya", classRole: "admin" }],
      instructors: [{ _id: "inst1", first_name: "Aya" }],
      students: [{ _id: "stud1", first_name: "Mona" }],
    };

    classService.getClassMembers.mockResolvedValue(mockData);

    await classController.getClassMembers(req, res);

    expect(classService.getClassMembers).toHaveBeenCalledWith(
      "class123",
      "user123",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockData,
    });
  });

  test("should return 400 with error message when service throws", async () => {
    classService.getClassMembers.mockRejectedValue(
      new Error("Class not found."),
    );

    await classController.getClassMembers(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Class not found.",
    });
  });
});
