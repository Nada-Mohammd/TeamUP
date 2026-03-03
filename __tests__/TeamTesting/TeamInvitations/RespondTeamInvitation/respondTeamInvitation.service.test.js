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

describe("Team Service - respondToTeamInvitation", () => {
  afterEach(() => jest.clearAllMocks());

  it("accepts invitation and adds student to team", async () => {
    const save = jest.fn().mockResolvedValue(true);
    TeamJoinRequest.findById.mockResolvedValue({
      _id: "inv1",
      flowType: "LEADER_INVITATION",
      status: "PENDING",
      receiverId: "student1",
      senderId: "leader1",
      teamId: "team1",
      save,
    });
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
    User.findById
      .mockReturnValueOnce({
        select: jest
          .fn()
          .mockResolvedValue({
            role: "Student",
            first_name: "Mona",
            last_name: "S",
          }),
      })
      .mockReturnValueOnce({
        select: jest
          .fn()
          .mockResolvedValue({ first_name: "Mona", last_name: "S" }),
      });
    ClassProfile.findOne.mockResolvedValue({ _id: "cp1" });
    TeamMember.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ teamId: null }),
    });
    TeamMember.countDocuments.mockResolvedValue(1);
    TeamMember.create.mockResolvedValue({ _id: "tm1" });
    TeamMember.find.mockReturnValue({
      select: jest
        .fn()
        .mockResolvedValue([
          { studentId: "leader1" },
          { studentId: "student1" },
        ]),
    });
    Notification.insertMany.mockResolvedValue([{ userId: "leader1" }]);

    const result = await teamService.respondToTeamInvitation({
      invitationId: "inv1",
      studentId: "student1",
      action: "accept",
    });

    expect(TeamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team1",
        studentId: "student1",
        role: "MEMBER",
      }),
    );
    expect(result.status).toBe("ACCEPTED");
  });

  it("rejects invitation and notifies leader", async () => {
    const save = jest.fn().mockResolvedValue(true);
    TeamJoinRequest.findById.mockResolvedValue({
      _id: "inv1",
      flowType: "LEADER_INVITATION",
      status: "PENDING",
      receiverId: "student1",
      senderId: "leader1",
      teamId: "team1",
      save,
    });
    Notification.create.mockResolvedValue({ _id: "n1" });

    const result = await teamService.respondToTeamInvitation({
      invitationId: "inv1",
      studentId: "student1",
      action: "reject",
    });

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "leader1", type: "INVITATION_STATUS" }),
    );
    expect(result.status).toBe("REJECTED");
  });
});
