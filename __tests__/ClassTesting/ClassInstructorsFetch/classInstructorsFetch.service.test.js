const classService = require("../../../src/services/class.service");
const Class = require("../../../src/models/Class");
const ClassProfile = require("../../../src/models/ClassProfile");

jest.mock("../../../src/models/Class");
jest.mock("../../../src/models/ClassProfile");

describe("classService.getClassInstructors", () => {
  const classId = "class1";
  const requesterId = "user1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("throws when class does not exist", async () => {
    Class.findById.mockResolvedValue(null);

    await expect(
      classService.getClassInstructors(classId, requesterId),
    ).rejects.toThrow("Class not found.");
  });

  test("throws when requester is not class member", async () => {
    Class.findById.mockResolvedValue({ _id: classId });
    ClassProfile.findOne.mockResolvedValue(null);

    await expect(
      classService.getClassInstructors(classId, requesterId),
    ).rejects.toThrow("You are not a member of this class.");
  });

  test("returns only instructors", async () => {
    Class.findById.mockResolvedValue({ _id: classId });
    ClassProfile.findOne.mockResolvedValue({ _id: "membership1" });

    const classProfiles = [
      {
        userId: {
          _id: "inst1",
          first_name: "Mona",
          last_name: "Ali",
          username: "mona",
          email: "mona@fci-cu.edu.eg",
          role: "Instructor",
        },
        classRole: "admin",
        joined_date: new Date("2026-01-01"),
      },
      {
        userId: {
          _id: "std1",
          first_name: "Nada",
          last_name: "H",
          username: "nada",
          email: "20220001@stud.fci-cu.edu.eg",
          role: "Student",
        },
        classRole: "member",
        joined_date: new Date("2026-01-02"),
      },
    ];

    const sortMock = jest.fn().mockResolvedValue(classProfiles);
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
    ClassProfile.find.mockReturnValue({ populate: populateMock });

    const result = await classService.getClassInstructors(classId, requesterId);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      _id: "inst1",
      first_name: "Mona",
      role: "Instructor",
      classRole: "admin",
    });
  });
});
