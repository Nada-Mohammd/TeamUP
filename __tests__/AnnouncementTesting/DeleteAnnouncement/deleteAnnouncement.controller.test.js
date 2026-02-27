const announcementController = require("../../../src/controllers/announcement.controller");
const announcementService = require("../../../src/services/announcement.service");

jest.mock("../../../src/services/announcement.service");

describe("Delete Announcement Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { id: "ann-1" },
      user: { _id: "inst-1" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it("deletes announcement successfully", async () => {
    announcementService.deleteAnnouncement.mockResolvedValue(true);

    await announcementController.deleteAnnouncement(req, res);

    expect(announcementService.deleteAnnouncement).toHaveBeenCalledWith(
      "ann-1",
      "inst-1",
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Announcement deleted successfully",
    });
  });

  it("returns 400 when service throws", async () => {
    announcementService.deleteAnnouncement.mockRejectedValue(
      new Error("Delete failed"),
    );

    await announcementController.deleteAnnouncement(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Delete failed",
    });
  });
});
