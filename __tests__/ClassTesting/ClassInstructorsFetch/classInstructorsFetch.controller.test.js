const classController = require("../../../src/controllers/class.controller");
const classService = require("../../../src/services/class.service");

jest.mock("../../../src/services/class.service");

describe("classController.getClassInstructors", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { classId: "class1" },
      user: { id: "user1" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test("returns 200 with instructors list", async () => {
    const instructors = [
      {
        _id: "inst1",
        first_name: "Mona",
        last_name: "Ali",
        role: "Instructor",
      },
    ];

    classService.getClassInstructors.mockResolvedValue(instructors);

    await classController.getClassInstructors(req, res);

    expect(classService.getClassInstructors).toHaveBeenCalledWith(
      "class1",
      "user1",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: instructors,
    });
  });

  test("returns 400 when service throws", async () => {
    classService.getClassInstructors.mockRejectedValue(
      new Error("Class not found."),
    );

    await classController.getClassInstructors(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Class not found.",
    });
  });
});
