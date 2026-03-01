const classService = require("../../../src/services/class.service");
const Class = require("../../../src/models/Class");
const ClassProfile = require("../../../src/models/ClassProfile");

jest.mock("../../../src/models/Class");
jest.mock("../../../src/models/ClassProfile");

describe("classService.getClassMembers", () => {
  const classId = "60a1b2c3d4e5f67890123456";
  const requesterId = "60a1b2c3d4e5f67890123457";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should throw if class is not found", async () => {
    Class.findById.mockResolvedValue(null);

    await expect(
      classService.getClassMembers(classId, requesterId),
    ).rejects.toThrow("Class not found.");
  });

  test("should throw if requester is not a member of the class", async () => {
    Class.findById.mockResolvedValue({ _id: classId });
    ClassProfile.findOne.mockResolvedValue(null);

    await expect(
      classService.getClassMembers(classId, requesterId),
    ).rejects.toThrow("You are not a member of this class.");
  });

  test("should return instructors and students arrays and ignore null populated users", async () => {
    Class.findById.mockResolvedValue({ _id: classId });
    ClassProfile.findOne.mockResolvedValue({
      classId,
      userId: requesterId,
      classRole: "member",
    });

    const classProfiles = [
      {
        userId: {
          _id: "inst1",
          first_name: "Aya",
          last_name: "Hassan",
          username: "ayah",
          email: "aya@fci-cu.edu.eg",
          role: "Instructor",
        },
        classRole: "admin",
        joined_date: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        userId: null,
        classRole: "member",
        joined_date: new Date("2026-01-02T00:00:00.000Z"),
      },
      {
        userId: {
          _id: "stud1",
          first_name: "Mona",
          last_name: "Ali",
          username: "monaa",
          email: "20221175@stud.fci-cu.edu.eg",
          role: "Student",
        },
        classRole: "member",
        joined_date: new Date("2026-01-03T00:00:00.000Z"),
      },
    ];

    const sortMock = jest.fn().mockResolvedValue(classProfiles);
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
    ClassProfile.find.mockReturnValue({ populate: populateMock });

    const result = await classService.getClassMembers(classId, requesterId);

    expect(ClassProfile.find).toHaveBeenCalledWith({ classId });
    expect(populateMock).toHaveBeenCalledWith({
      path: "userId",
      select: "first_name last_name username email role",
    });
    expect(sortMock).toHaveBeenCalledWith({ joined_date: 1 });

    expect(result.instructors).toHaveLength(1);
    expect(result.students).toHaveLength(1);
    expect(result.instructors[0]).toMatchObject({
      _id: "inst1",
      first_name: "Aya",
      role: "Instructor",
      classRole: "admin",
    });
    expect(result.students[0]).toMatchObject({
      _id: "stud1",
      first_name: "Mona",
      role: "Student",
      classRole: "member",
    });
  });
});
