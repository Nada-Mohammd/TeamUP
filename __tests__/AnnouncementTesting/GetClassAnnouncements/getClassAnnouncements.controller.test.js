const announcementController = require("../../../src/controllers/announcement.controller");
const announcementService = require("../../../src/services/announcement.service");

jest.mock("../../../src/services/announcement.service");

describe("Get Class Announcements Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    req = { params: { classId: "class-1" } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("returns class announcements successfully", async () => {
    const announcements = [{ _id: "a1" }, { _id: "a2" }];
    announcementService.getClassAnnouncements.mockResolvedValue(announcements);

    await announcementController.getClassAnnouncements(req, res);

    expect(announcementService.getClassAnnouncements).toHaveBeenCalledWith(
      "class-1",
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: announcements,
    });
  });

  it("returns 500 when service throws", async () => {
    announcementService.getClassAnnouncements.mockRejectedValue(
      new Error("Fetch failed"),
    );

    await announcementController.getClassAnnouncements(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Fetch failed",
    });
  });
});
