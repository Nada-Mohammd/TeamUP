const courseworkController = require("../../../src/controllers/coursework.controller");
const Coursework = require("../../../src/models/CourseWork");

jest.mock("../../../src/models/CourseWork");

describe("Coursework GetById Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { courseworkId: "cw-1" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it("returns 200 with coursework when found and not deleted", async () => {
    const mockCoursework = {
      _id: "cw-1",
      name: "Project 1",
      isDeleted: false,
      toObject: jest.fn().mockReturnValue({ _id: "cw-1", name: "Project 1" }),
    };

    Coursework.findById.mockResolvedValue(mockCoursework);

    await courseworkController.getCourseworkById(req, res);

    expect(Coursework.findById).toHaveBeenCalledWith("cw-1");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { _id: "cw-1", name: "Project 1" },
    });
  });

  it("returns 404 when coursework not found", async () => {
    Coursework.findById.mockResolvedValue(null);

    await courseworkController.getCourseworkById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Coursework not found",
    });
  });

  it("returns 404 when coursework is soft deleted", async () => {
    Coursework.findById.mockResolvedValue({ _id: "cw-1", isDeleted: true });

    await courseworkController.getCourseworkById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Coursework not found",
    });
  });

  it("returns 500 on unexpected error", async () => {
    Coursework.findById.mockRejectedValue(new Error("DB failure"));

    await courseworkController.getCourseworkById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "DB failure",
    });
  });
});
