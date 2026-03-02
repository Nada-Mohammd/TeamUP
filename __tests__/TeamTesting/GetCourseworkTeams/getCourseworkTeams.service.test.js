const teamService = require("../../../src/services/team.service");
const Class = require("../../../src/models/Class");
const Coursework = require("../../../src/models/CourseWork");
const Team = require("../../../src/models/Team");
const TeamMember = require("../../../src/models/TeamMembers");

jest.mock("../../../src/models/Class");
jest.mock("../../../src/models/CourseWork");
jest.mock("../../../src/models/Team");
jest.mock("../../../src/models/TeamMembers");

describe("teamService.getCourseworkTeams", () => {
  const classId = "60a1b2c3d4e5f67890123456";
  const courseworkId = "60a1b2c3d4e5f67890123457";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should throw if class does not exist", async () => {
    Class.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(
      teamService.getCourseworkTeams(classId, courseworkId, "false"),
    ).rejects.toThrow("Class not found.");
  });

  test("should throw if coursework does not belong to class", async () => {
    Class.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: classId, course_name: "DS" }),
    });
    Coursework.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: courseworkId,
        name: "CW1",
        classId: { toString: () => "differentClassId" },
      }),
    });

    await expect(
      teamService.getCourseworkTeams(classId, courseworkId, "false"),
    ).rejects.toThrow("This coursework does not belong to the provided class.");
  });

  test("should return unlocked teams with members and requested shape", async () => {
    Class.findById.mockReturnValue({
      select: jest
        .fn()
        .mockResolvedValue({ _id: classId, course_name: "Data Structures" }),
    });

    Coursework.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: courseworkId,
        name: "Project 1",
        classId: { toString: () => classId },
      }),
    });

    const teams = [
      { _id: "team1", name: "Alpha" },
      { _id: "team2", name: "Beta" },
    ];

    const teamSortMock = jest.fn().mockResolvedValue(teams);
    const teamSelectMock = jest.fn().mockReturnValue({ sort: teamSortMock });
    Team.find.mockReturnValue({ select: teamSelectMock });

    const memberDocs = [
      {
        teamId: { toString: () => "team1" },
        role: "LEADER",
        studentId: {
          _id: "u1",
          first_name: "Nada",
          last_name: "Ali",
          username: "nada",
          email: "nada@stud.fci-cu.edu.eg",
        },
      },
      {
        teamId: { toString: () => "team1" },
        role: "MEMBER",
        studentId: {
          _id: "u2",
          first_name: "Salma",
          last_name: "Maher",
          username: "salma",
          email: "salma@stud.fci-cu.edu.eg",
        },
      },
      {
        teamId: { toString: () => "team2" },
        role: "LEADER",
        studentId: {
          _id: "u3",
          first_name: "Omar",
          last_name: "Ibrahim",
          username: "omar",
          email: "omar@stud.fci-cu.edu.eg",
        },
      },
    ];

    const memberSortMock = jest.fn().mockResolvedValue(memberDocs);
    const memberSelectMock = jest
      .fn()
      .mockReturnValue({ sort: memberSortMock });
    const memberPopulateMock = jest
      .fn()
      .mockReturnValue({ select: memberSelectMock });
    TeamMember.find.mockReturnValue({ populate: memberPopulateMock });

    const result = await teamService.getCourseworkTeams(
      classId,
      courseworkId,
      "false",
    );

    expect(Team.find).toHaveBeenCalledWith({
      classId,
      courseworkId,
      isLocked: false,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      teamName: "Alpha",
      courseworkName: "Project 1",
      className: "Data Structures",
    });
    expect(result[0].teamMembers).toHaveLength(2);
    expect(result[1]).toMatchObject({
      teamName: "Beta",
      courseworkName: "Project 1",
      className: "Data Structures",
    });
    expect(result[1].teamMembers).toHaveLength(1);
  });
});
