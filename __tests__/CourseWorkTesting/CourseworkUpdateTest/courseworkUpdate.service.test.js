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

describe("Coursework Update Service", () => {
  const courseworkId = "cw-1";
  const instructorId = "inst-1";
  const classId = "class-1";

  const updateData = {
    name: "Updated Coursework",
    deadline: "2026-03-05T09:00:00.000Z",
    team_size_min: 2,
    team_size_max: 4,
  };

  const existingCoursework = {
    _id: courseworkId,
    classId,
    files: [{ _id: "f-old", file_name: "old.pdf" }],
    isDeleted: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    Coursework.findById.mockResolvedValue(existingCoursework);
    User.findById.mockResolvedValue({ _id: instructorId, role: "Instructor" });
    ClassProfile.findOne.mockResolvedValue({ _id: "admin-profile" });
    Coursework.findByIdAndUpdate.mockResolvedValue({
      _id: courseworkId,
      files: [],
    });
    Post.findOne.mockResolvedValue(null);
    Post.create.mockResolvedValue({ _id: "post-1" });
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
      courseworkService.updateCoursework(
        courseworkId,
        instructorId,
        updateData,
        [],
      ),
    ).rejects.toThrow("Coursework not found or has been deleted.");
  });

  it("throws when coursework is soft deleted", async () => {
    Coursework.findById.mockResolvedValue({
      ...existingCoursework,
      isDeleted: true,
    });

    await expect(
      courseworkService.updateCoursework(
        courseworkId,
        instructorId,
        updateData,
        [],
      ),
    ).rejects.toThrow("Coursework not found or has been deleted.");
  });

  it("throws when user is not an instructor", async () => {
    User.findById.mockResolvedValue({ _id: instructorId, role: "Student" });

    await expect(
      courseworkService.updateCoursework(
        courseworkId,
        instructorId,
        updateData,
        [],
      ),
    ).rejects.toThrow("Only instructors can update coursework.");
  });

  it("throws when instructor is not class admin", async () => {
    ClassProfile.findOne.mockResolvedValue(null);

    await expect(
      courseworkService.updateCoursework(
        courseworkId,
        instructorId,
        updateData,
        [],
      ),
    ).rejects.toThrow("Only class admins can update this coursework.");
  });

  it("throws when team size min is greater than max", async () => {
    const invalidData = { ...updateData, team_size_min: 6, team_size_max: 2 };

    await expect(
      courseworkService.updateCoursework(
        courseworkId,
        instructorId,
        invalidData,
        [],
      ),
    ).rejects.toThrow("team_size_min cannot be greater than team_size_max.");
  });

  it("updates coursework, creates post when missing, and notifies instructor", async () => {
    const newFiles = [{ _id: "f-new", file_name: "new.pdf" }];
    const updated = {
      _id: courseworkId,
      files: [...existingCoursework.files, ...newFiles],
    };
    Coursework.findByIdAndUpdate.mockResolvedValue(updated);

    const populateMock = jest
      .fn()
      .mockResolvedValue([
        { userId: { _id: "student-1", role: "Student" } },
        { userId: { _id: "ta-1", role: "TA" } },
        { userId: { _id: "student-2", role: "Student" } },
      ]);
    ClassProfile.find.mockReturnValue({ populate: populateMock });

    const result = await courseworkService.updateCoursework(
      courseworkId,
      instructorId,
      updateData,
      newFiles,
    );

    expect(Coursework.findByIdAndUpdate).toHaveBeenCalledWith(
      courseworkId,
      expect.objectContaining({
        ...updateData,
        files: [...existingCoursework.files, ...newFiles],
      }),
      { new: true, runValidators: true },
    );

    expect(Post.create).toHaveBeenCalledWith({
      type: "COURSEWORK",
      classId,
      authorId: instructorId,
      courseworkId,
      isDeleted: false,
    });

    expect(notificationService.createBulkNotifications).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: "student-1",
        type: "COURSEWORK",
        referenceId: courseworkId,
      }),
      expect.objectContaining({
        userId: "student-2",
        type: "COURSEWORK",
        referenceId: courseworkId,
      }),
    ]);

    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: instructorId,
        type: "COURSEWORK",
        referenceId: courseworkId,
        courseCode: "CS101",
        classColor: "blue",
      }),
    );

    expect(result).toBe(updated);
  });

  it("restores and saves post when existing post is soft-deleted", async () => {
    const save = jest.fn().mockResolvedValue({});
    Post.findOne.mockResolvedValue({ isDeleted: true, save });

    await courseworkService.updateCoursework(
      courseworkId,
      instructorId,
      updateData,
      [],
    );

    expect(Post.create).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("saves existing active post without creating a new one", async () => {
    const save = jest.fn().mockResolvedValue({});
    Post.findOne.mockResolvedValue({ isDeleted: false, save });

    await courseworkService.updateCoursework(
      courseworkId,
      instructorId,
      updateData,
      [],
    );

    expect(Post.create).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("does not create student bulk notifications when no student members exist", async () => {
    ClassProfile.find.mockReturnValue({
      populate: jest
        .fn()
        .mockResolvedValue([{ userId: { _id: "ta-1", role: "TA" } }]),
    });

    await courseworkService.updateCoursework(
      courseworkId,
      instructorId,
      updateData,
      [],
    );

    expect(notificationService.createBulkNotifications).not.toHaveBeenCalled();
    expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
  });
});
