const courseworkService = require("../../../src/services/coursework.service");
const Coursework = require("../../../src/models/CourseWork");

jest.mock("../../../src/models/CourseWork");

describe("Coursework GetById Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns coursework when found and not deleted", async () => {
    const mockCoursework = { _id: "cw-1", isDeleted: false, name: "Project 1" };
    Coursework.findById.mockResolvedValue(mockCoursework);

    const result = await courseworkService.getCourseworkById("cw-1");

    expect(Coursework.findById).toHaveBeenCalledWith("cw-1");
    expect(result).toEqual(mockCoursework);
  });

  it("throws 404 error when coursework is not found", async () => {
    Coursework.findById.mockResolvedValue(null);

    await expect(
      courseworkService.getCourseworkById("cw-1"),
    ).rejects.toMatchObject({
      message: "Coursework not found",
      statusCode: 404,
    });
  });

  it("throws 404 error when coursework is soft deleted", async () => {
    Coursework.findById.mockResolvedValue({ _id: "cw-1", isDeleted: true });

    await expect(
      courseworkService.getCourseworkById("cw-1"),
    ).rejects.toMatchObject({
      message: "Coursework not found",
      statusCode: 404,
    });
  });
});
