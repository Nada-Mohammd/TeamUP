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

describe("Team Service - sendTeamInvitation", () => {
  afterEach(() => jest.clearAllMocks());

  it("creates invitation and notifies student", async () => {
    Team.findById.mockResolvedValue({
      _id: "team1",
      classId: "class1",
      courseworkId: "cw1",
      isLocked: false,
    });
    TeamMember.findOne
      .mockResolvedValueOnce({ _id: "leaderMembership" })
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue({ teamId: null }),
      });
    Coursework.findById.mockResolvedValue({
      _id: "cw1",
      team_size_max: 5,
      isDeleted: false,
    });
    User.findById.mockReturnValue({
      select: jest
        .fn()
        .mockResolvedValue({
          role: "Student",
          first_name: "Nada",
          last_name: "H",
        }),
    });
    ClassProfile.findOne.mockResolvedValue({ _id: "cp1" });
    TeamMember.countDocuments.mockResolvedValue(1);
    TeamJoinRequest.findOne.mockResolvedValue(null);
    TeamJoinRequest.create.mockResolvedValue({ _id: "inv1" });
    Notification.create.mockResolvedValue({ _id: "n1" });

    const result = await teamService.sendTeamInvitation({
      teamId: "team1",
      leaderId: "leader1",
      studentId: "student1",
    });

    expect(TeamJoinRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        flowType: "LEADER_INVITATION",
        senderId: "leader1",
        receiverId: "student1",
      }),
    );
    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "student1", type: "TEAM_INVITATION" }),
    );
    expect(result._id).toBe("inv1");
  });

  it("throws 409 when pending invitation already exists", async () => {
    Team.findById.mockResolvedValue({
      _id: "team1",
      classId: "class1",
      courseworkId: "cw1",
      isLocked: false,
    });
    TeamMember.findOne
      .mockResolvedValueOnce({ _id: "leaderMembership" })
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue({ teamId: null }),
      });
    Coursework.findById.mockResolvedValue({
      _id: "cw1",
      team_size_max: 5,
      isDeleted: false,
    });
    User.findById.mockReturnValue({
      select: jest
        .fn()
        .mockResolvedValue({
          role: "Student",
          first_name: "Nada",
          last_name: "H",
        }),
    });
    ClassProfile.findOne.mockResolvedValue({ _id: "cp1" });
    TeamMember.countDocuments.mockResolvedValue(1);
    TeamJoinRequest.findOne.mockResolvedValue({ _id: "existing" });

    await expect(
      teamService.sendTeamInvitation({
        teamId: "team1",
        leaderId: "leader1",
        studentId: "student1",
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "A pending invitation already exists for this student.",
    });
  });
});
