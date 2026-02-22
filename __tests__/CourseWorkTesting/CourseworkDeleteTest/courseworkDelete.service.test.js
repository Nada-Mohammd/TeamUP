const courseworkService = require("../../../src/services/coursework.service");
const Coursework = require("../../../src/models/CourseWork");
const User = require("../../../src/models/User");
const ClassProfile = require("../../../src/models/ClassProfile");
const notificationService = require("../../../src/services/notification.service");
const Post = require("../../../src/models/Post");
const Class = require("../../../src/models/Class");

jest.mock("../../../src/models/CourseWork");
jest.mock("../../../src/models/User");
jest.mock("../../../src/models/ClassProfile");
jest.mock("../../../src/services/notification.service");
jest.mock("../../../src/models/Post");
jest.mock("../../../src/models/Class");

describe("Coursework Delete Service", () => {
  const courseworkId = "cw-1";
  const instructorId = "inst-1";
  const classId = "class-1";

  const existingCoursework = {
    _id: courseworkId,
    classId,
    name: "Project 1",
    isDeleted: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    Coursework.findById.mockResolvedValue(existingCoursework);
    User.findById.mockResolvedValue({ _id: instructorId, role: "Instructor" });
    ClassProfile.findOne.mockResolvedValue({ _id: "admin-profile" });
    Coursework.findByIdAndUpdate.mockResolvedValue({});
    Post.findOneAndUpdate.mockResolvedValue({});
    Class.findById.mockResolvedValue({
      course_code: "CS101",
      class_color: "blue",
    });
    ClassProfile.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([]),
    });
    notificationService.createBulkNotifications.mockResolvedValue([]);
    notificationService.createNotification.mockResolvedValue({});
  });

  it("throws when coursework not found", async () => {
    Coursework.findById.mockResolvedValue(null);

    await expect(
      courseworkService.deleteCoursework(courseworkId, instructorId),
    ).rejects.toThrow("Coursework not found.");
  });

  it("throws when coursework is already deleted", async () => {
    Coursework.findById.mockResolvedValue({
      ...existingCoursework,
      isDeleted: true,
    });

    await expect(
      courseworkService.deleteCoursework(courseworkId, instructorId),
    ).rejects.toThrow("Coursework not found.");
  });

  it("throws when user is not an instructor", async () => {
    User.findById.mockResolvedValue({ _id: instructorId, role: "Student" });

    await expect(
      courseworkService.deleteCoursework(courseworkId, instructorId),
    ).rejects.toThrow("Only instructors can delete coursework.");
  });

  it("throws when instructor is not class admin", async () => {
    ClassProfile.findOne.mockResolvedValue(null);

    await expect(
      courseworkService.deleteCoursework(courseworkId, instructorId),
    ).rejects.toThrow("Only class admins can delete this coursework.");
  });

  it("soft-deletes coursework/post and notifies students + instructor", async () => {
    ClassProfile.find.mockReturnValue({
      populate: jest
        .fn()
        .mockResolvedValue([
          { userId: { _id: "student-1", role: "Student" } },
          { userId: { _id: "ta-1", role: "TA" } },
          { userId: { _id: "student-2", role: "Student" } },
        ]),
    });

    await courseworkService.deleteCoursework(courseworkId, instructorId);

    expect(Coursework.findByIdAndUpdate).toHaveBeenCalledWith(courseworkId, {
      isDeleted: true,
    });
    expect(Post.findOneAndUpdate).toHaveBeenCalledWith(
      { courseworkId },
      { isDeleted: true },
    );

    expect(notificationService.createBulkNotifications).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: "student-1",
        type: "COURSEWORK",
        referenceId: courseworkId,
        courseCode: "CS101",
        classColor: "blue",
      }),
      expect.objectContaining({
        userId: "student-2",
        type: "COURSEWORK",
        referenceId: courseworkId,
        courseCode: "CS101",
        classColor: "blue",
      }),
    ]);

    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: instructorId,
        type: "COURSEWORK",
        referenceId: courseworkId,
        courseCode: "CS101",
        classColor: "blue",
        message: expect.stringContaining(
          '"Project 1" was deleted successfully',
        ),
      }),
    );
  });

  it("does not send bulk notifications when no students exist", async () => {
    ClassProfile.find.mockReturnValue({
      populate: jest
        .fn()
        .mockResolvedValue([{ userId: { _id: "ta-1", role: "TA" } }]),
    });

    await courseworkService.deleteCoursework(courseworkId, instructorId);

    expect(notificationService.createBulkNotifications).not.toHaveBeenCalled();
    expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
  });
});
