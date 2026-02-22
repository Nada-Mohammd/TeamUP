const announcementService = require("../../../src/services/announcement.service");
const Post = require("../../../src/models/Post");

jest.mock("../../../src/models/Post");

describe("Delete Announcement Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when announcement is not found", async () => {
    Post.findOne.mockResolvedValue(null);

    await expect(
      announcementService.deleteAnnouncement("ann-1", "inst-1"),
    ).rejects.toThrow("Announcement not found.");
  });

  it("throws when instructor is not owner", async () => {
    Post.findOne.mockResolvedValue({
      _id: "ann-1",
      authorId: { toString: () => "inst-2" },
      isDeleted: false,
      save: jest.fn(),
    });

    await expect(
      announcementService.deleteAnnouncement("ann-1", "inst-1"),
    ).rejects.toThrow("You are not allowed to delete this announcement.");
  });
});
