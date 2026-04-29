jest.mock("../../../src/models/Team");
jest.mock("../../../src/models/Class");
jest.mock("../../../src/models/TeamMembers");
jest.mock("../../../src/models/CourseWork");
jest.mock("../../../src/models/ClassProfile");
jest.mock("../../../src/models/User");
jest.mock("../../../src/models/TeamJoinRequest");
jest.mock("../../../src/models/Notification");
jest.mock("../../../src/sockets/socket", () => ({
  onlineUsers: new Map(),
  io: { to: jest.fn(() => ({ emit: jest.fn() })) },
}));
jest.mock("../../../src/services/notification.service", () => ({}));

const teamService = require("../../../src/services/team.service");
const Team = require("../../../src/models/Team");
const TeamMember = require("../../../src/models/TeamMembers");
const Coursework = require("../../../src/models/CourseWork");
const ClassProfile = require("../../../src/models/ClassProfile");
const User = require("../../../src/models/User");

describe("teamService.assignInstructorToTeam", () => {
  const teamId = "team1";
  const leaderId = "leader1";
  const instructorId = "inst1";

  const mockTeam = {
    _id: teamId,
    classId: "class1",
    courseworkId: "cw1",
    instructorId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    Team.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockTeam),
    });

    TeamMember.findOne.mockResolvedValue({ _id: "leaderMembership" });

    Coursework.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "cw1",
        classId: "class1",
        isDeleted: false,
      }),
    });

    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: instructorId,
        first_name: "Mona",
        last_name: "Ali",
        role: "Instructor",
      }),
    });

    ClassProfile.findOne.mockResolvedValue({ _id: "cp1" });
  });

  test("assigns instructor atomically when validations pass", async () => {
    const updatedTeam = {
      _id: teamId,
      name: "Team A",
      instructorId: {
        _id: instructorId,
        first_name: "Mona",
        last_name: "Ali",
      },
      courseworkId: { name: "Project 1" },
      classId: {
        course_name: "Software Engineering",
        class_color: "#123456",
        class_code: "SE-01",
      },
    };

    const populate3 = jest.fn().mockResolvedValue(updatedTeam);
    const populate2 = jest.fn().mockReturnValue({ populate: populate3 });
    const populate1 = jest.fn().mockReturnValue({ populate: populate2 });

    Team.findOneAndUpdate.mockReturnValue({ populate: populate1 });

    const result = await teamService.assignInstructorToTeam({
      teamId,
      leaderId,
      instructorId,
    });

    expect(Team.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: teamId, instructorId: null },
      { $set: { instructorId } },
      { new: true },
    );

    expect(result).toMatchObject({
      teamId,
      teamName: "Team A",
      instructor: {
        id: instructorId,
        name: "Mona Ali",
      },
      courseworkName: "Project 1",
      className: "Software Engineering",
    });
  });

  test("throws 404 when team does not exist", async () => {
    Team.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(
      teamService.assignInstructorToTeam({ teamId, leaderId, instructorId }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Team not found.",
    });
  });

  test("throws 403 when requester is not team leader", async () => {
    TeamMember.findOne.mockResolvedValue(null);

    await expect(
      teamService.assignInstructorToTeam({ teamId, leaderId, instructorId }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Only the team leader can assign an instructor.",
    });
  });

  test("throws 400 when selected user is not instructor", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: "Student" }),
    });

    await expect(
      teamService.assignInstructorToTeam({ teamId, leaderId, instructorId }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Selected user is not an instructor.",
    });
  });

  test("throws 400 when instructor is not a class member", async () => {
    ClassProfile.findOne.mockResolvedValue(null);

    await expect(
      teamService.assignInstructorToTeam({ teamId, leaderId, instructorId }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Selected instructor is not a member of this class.",
    });
  });

  test("throws 409 when instructor was already assigned by concurrent request", async () => {
    const populate3 = jest.fn().mockResolvedValue(null);
    const populate2 = jest.fn().mockReturnValue({ populate: populate3 });
    const populate1 = jest.fn().mockReturnValue({ populate: populate2 });

    Team.findOneAndUpdate.mockReturnValue({ populate: populate1 });

    await expect(
      teamService.assignInstructorToTeam({ teamId, leaderId, instructorId }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "An instructor is already assigned to this team.",
    });
  });
});
