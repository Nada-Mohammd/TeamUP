const announcementController = require("../../../src/controllers/announcement.controller");
const announcementService = require("../../../src/services/announcement.service");

jest.mock("../../../src/services/announcement.service");

describe("Create Announcement Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { classId: "class-1" },
      user: { _id: "inst-1" },
      body: { announcement_text: "Hello class" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it("creates announcement successfully", async () => {
    const mockAnnouncement = { _id: "a1", announcement_text: "Hello class" };
    announcementService.createAnnouncement.mockResolvedValue(mockAnnouncement);

    await announcementController.createAnnouncement(req, res);

    expect(announcementService.createAnnouncement).toHaveBeenCalledWith(
      "inst-1",
      "class-1",
      "Hello class",
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Announcement created successfully",
      data: mockAnnouncement,
    });
  });

  it("returns 400 when service throws", async () => {
    announcementService.createAnnouncement.mockRejectedValue(
      new Error("Creation failed"),
    );

    await announcementController.createAnnouncement(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Creation failed",
    });
  });
});
