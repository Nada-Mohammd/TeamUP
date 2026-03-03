const teamController = require("../../../../src/controllers/team.controller");
const teamService = require("../../../../src/services/team.service");

jest.mock("../../../../src/services/team.service");

describe("Team Controller - sendTeamInvitation", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { teamId: "team1" },
      user: { id: "leader1" },
      body: { studentId: "student1" },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
  });

  it("returns 201 on success", async () => {
    teamService.sendTeamInvitation.mockResolvedValue({ _id: "inv1" });

    await teamController.sendTeamInvitation(req, res);

    expect(teamService.sendTeamInvitation).toHaveBeenCalledWith({
      teamId: "team1",
      leaderId: "leader1",
      studentId: "student1",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns 403 on unauthorized leader", async () => {
    teamService.sendTeamInvitation.mockRejectedValue({
      statusCode: 403,
      message: "Only team leader can invite students.",
    });

    await teamController.sendTeamInvitation(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Only team leader can invite students.",
    });
  });
});
