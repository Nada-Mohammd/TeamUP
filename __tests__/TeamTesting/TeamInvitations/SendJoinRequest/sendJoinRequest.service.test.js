jest.mock("../../../../src/models/Team");
jest.mock("../../../../src/models/TeamMembers");
jest.mock("../../../../src/models/CourseWork");
jest.mock("../../../../src/models/ClassProfile");
jest.mock("../../../../src/models/User");
jest.mock("../../../../src/models/TeamJoinRequest");
jest.mock("../../../../src/models/Notification");
jest.mock("../../../../src/sockets/socket", () => ({
  onlineUsers: new Map(),
  io: { to: jest.fn(() => ({ emit: jest.fn() })) },
}));

const teamService = require("../../../../src/services/team.service");
const Team = require("../../../../src/models/Team");
const TeamMember = require("../../../../src/models/TeamMembers");
const Coursework = require("../../../../src/models/CourseWork");
const ClassProfile = require("../../../../src/models/ClassProfile");
const User = require("../../../../src/models/User");
const TeamJoinRequest = require("../../../../src/models/TeamJoinRequest");
const Notification = require("../../../../src/models/Notification");

describe("Team Service - sendJoinRequest", () => {
  afterEach(() => jest.clearAllMocks());

  it("creates join request and notifies leader", async () => {
    Team.findById.mockResolvedValue({
      _id: "team1",
      classId: "class1",
      courseworkId: "cw1",
      isLocked: false,
    });
    Coursework.findById.mockResolvedValue({
      _id: "cw1",
      team_size_max: 5,
      isDeleted: false,
    });

    TeamMember.findOne
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ studentId: "leader1" }),
      })
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue({ teamId: null }),
      });

    User.findById.mockReturnValue({
      select: jest
        .fn()
        .mockResolvedValue({
          role: "Student",
          first_name: "Ali",
          last_name: "M",
        }),
    });
    ClassProfile.findOne.mockResolvedValue({ _id: "cp1" });
    TeamMember.countDocuments.mockResolvedValue(1);

    TeamJoinRequest.findOne.mockResolvedValue(null);
    TeamJoinRequest.create.mockResolvedValue({ _id: "req1" });
    Notification.create.mockResolvedValue({ _id: "n1" });

    const result = await teamService.sendJoinRequest({
      teamId: "team1",
      requesterId: "student1",
    });

    expect(TeamJoinRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team1",
        senderId: "student1",
        receiverId: "leader1",
        flowType: "STUDENT_REQUEST",
        status: "PENDING",
      }),
    );
    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "leader1", type: "TEAM_JOIN_REQUEST" }),
    );
    expect(result._id).toBe("req1");
  });

  it("throws 409 when pending request already exists", async () => {
    Team.findById.mockResolvedValue({
      _id: "team1",
      classId: "class1",
      courseworkId: "cw1",
      isLocked: false,
    });
    Coursework.findById.mockResolvedValue({
      _id: "cw1",
      team_size_max: 5,
      isDeleted: false,
    });
    TeamMember.findOne
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ studentId: "leader1" }),
      })
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue({ teamId: null }),
      });
    User.findById.mockReturnValue({
      select: jest
        .fn()
        .mockResolvedValue({
          role: "Student",
          first_name: "Ali",
          last_name: "M",
        }),
    });
    ClassProfile.findOne.mockResolvedValue({ _id: "cp1" });
    TeamMember.countDocuments.mockResolvedValue(1);
    TeamJoinRequest.findOne.mockResolvedValue({ _id: "existing" });

    await expect(
      teamService.sendJoinRequest({ teamId: "team1", requesterId: "student1" }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "A pending join request already exists.",
    });
  });
});
