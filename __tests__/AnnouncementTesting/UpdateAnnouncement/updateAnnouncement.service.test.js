const announcementService = require("../../../src/services/announcement.service");
const Post = require("../../../src/models/Post");
const ClassProfile = require("../../../src/models/ClassProfile");
const Class = require("../../../src/models/Class");
const notificationService = require("../../../src/services/notification.service");

jest.mock("../../../src/models/Post");
jest.mock("../../../src/models/ClassProfile");
jest.mock("../../../src/models/Class");
jest.mock("../../../src/services/notification.service");

describe("Update Announcement Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when announcement text is missing", async () => {
    await expect(
      announcementService.updateAnnouncement("ann-1", "inst-1", "   "),
    ).rejects.toThrow("Announcement text is required.");
  });

  it("updates announcement and sends notifications", async () => {
    const announcement = {
      _id: "ann-1",
      classId: "class-1",
      authorId: { toString: () => "inst-1" },
      announcement_text: "Old",
      save: jest.fn().mockResolvedValue(true),
    };
    Post.findOne.mockResolvedValue(announcement);

    ClassProfile.find.mockReturnValue({
      populate: jest
        .fn()
        .mockResolvedValue([{ userId: { _id: "student-1", role: "Student" } }]),
    });

    Class.findById.mockResolvedValue({
      course_code: "CSEN",
      class_color: "#123456",
    });

    notificationService.createBulkNotifications.mockResolvedValue([]);
    notificationService.createNotification.mockResolvedValue({ _id: "n1" });

    const result = await announcementService.updateAnnouncement(
      "ann-1",
      "inst-1",
      "New text",
    );

    expect(announcement.save).toHaveBeenCalled();
    expect(notificationService.createBulkNotifications).toHaveBeenCalledTimes(
      1,
    );
    expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
    expect(result).toEqual(announcement);
  });
});
