const teamController = require("../../../../src/controllers/team.controller");
const teamService = require("../../../../src/services/team.service");

jest.mock("../../../../src/services/team.service");

describe("Team Controller - respondToTeamInvitation", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { invitationId: "inv1" },
      user: { id: "student1" },
      body: { action: "reject" },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
  });

  it("returns 200 on success", async () => {
    teamService.respondToTeamInvitation.mockResolvedValue({
      success: true,
      status: "REJECTED",
    });

    await teamController.respondToTeamInvitation(req, res);

    expect(teamService.respondToTeamInvitation).toHaveBeenCalledWith({
      invitationId: "inv1",
      studentId: "student1",
      action: "reject",
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 404 when invitation is not found", async () => {
    teamService.respondToTeamInvitation.mockRejectedValue({
      statusCode: 404,
      message: "Team invitation not found.",
    });

    await teamController.respondToTeamInvitation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Team invitation not found.",
    });
  });
});
