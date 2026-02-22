const announcementController = require("../../../src/controllers/announcement.controller");
const announcementService = require("../../../src/services/announcement.service");

jest.mock("../../../src/services/announcement.service");

describe("Update Announcement Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { id: "ann-1" },
      user: { _id: "inst-1" },
      body: { announcement_text: "Updated text" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("updates announcement successfully", async () => {
    const updated = { _id: "ann-1", announcement_text: "Updated text" };
    announcementService.updateAnnouncement.mockResolvedValue(updated);

    await announcementController.updateAnnouncement(req, res);

    expect(announcementService.updateAnnouncement).toHaveBeenCalledWith(
      "ann-1",
      "inst-1",
      "Updated text",
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Announcement updated successfully",
      data: updated,
    });
  });

  it("returns 400 when service throws", async () => {
    announcementService.updateAnnouncement.mockRejectedValue(
      new Error("Update failed"),
    );

    await announcementController.updateAnnouncement(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Update failed",
    });
  });
});
