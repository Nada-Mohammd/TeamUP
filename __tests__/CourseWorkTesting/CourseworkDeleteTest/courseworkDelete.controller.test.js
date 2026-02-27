const courseworkController = require("../../../src/controllers/coursework.controller");
const courseworkService = require("../../../src/services/coursework.service");

jest.mock("../../../src/services/coursework.service");

describe("Coursework Delete Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { courseworkId: "cw-1" },
      user: { _id: "inst-1" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it("deletes coursework successfully", async () => {
    courseworkService.deleteCoursework.mockResolvedValue(undefined);

    await courseworkController.deleteCoursework(req, res);

    expect(courseworkService.deleteCoursework).toHaveBeenCalledWith(
      "cw-1",
      "inst-1",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Coursework deleted successfully",
    });
  });

  it("returns 400 when service throws", async () => {
    courseworkService.deleteCoursework.mockRejectedValue(
      new Error("Delete failed"),
    );

    await courseworkController.deleteCoursework(req, res);

    expect(courseworkService.deleteCoursework).toHaveBeenCalledWith(
      "cw-1",
      "inst-1",
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Delete failed",
    });
  });
});
