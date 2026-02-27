const announcementService = require("../../../src/services/announcement.service");
const Post = require("../../../src/models/Post");
const User = require("../../../src/models/User");
const ClassProfile = require("../../../src/models/ClassProfile");
const Class = require("../../../src/models/Class");
const notificationService = require("../../../src/services/notification.service");

jest.mock("../../../src/models/Post");
jest.mock("../../../src/models/User");
jest.mock("../../../src/models/ClassProfile");
jest.mock("../../../src/models/Class");
jest.mock("../../../src/services/notification.service");

describe("Create Announcement Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates announcement and sends notifications", async () => {
    User.findById.mockResolvedValue({ _id: "inst-1", role: "Instructor" });

    const createdAnnouncement = {
      _id: "ann-1",
      announcement_text: "Welcome all",
    };
    Post.create.mockResolvedValue(createdAnnouncement);

    const populatedMembers = [
      { userId: { _id: "student-1", role: "Student" } },
      { userId: { _id: "inst-2", role: "Instructor" } },
    ];
    ClassProfile.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue(populatedMembers),
    });

    Class.findById.mockResolvedValue({
      _id: "class-1",
      course_code: "CSEN",
      class_color: "#123456",
    });

    notificationService.createBulkNotifications.mockResolvedValue([]);
    notificationService.createNotification.mockResolvedValue({ _id: "n1" });

    const result = await announcementService.createAnnouncement(
      "inst-1",
      "class-1",
      "Welcome all",
    );

    expect(Post.create).toHaveBeenCalledWith({
      type: "ANNOUNCEMENT",
      classId: "class-1",
      authorId: "inst-1",
      announcement_text: "Welcome all",
    });
    expect(notificationService.createBulkNotifications).toHaveBeenCalledTimes(
      1,
    );
    expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
    expect(result).toEqual(createdAnnouncement);
  });

  it("throws if caller is not instructor", async () => {
    User.findById.mockResolvedValue({ _id: "u-1", role: "Student" });

    await expect(
      announcementService.createAnnouncement("u-1", "class-1", "Hello"),
    ).rejects.toThrow("Only instructors can create announcements.");
  });
});
