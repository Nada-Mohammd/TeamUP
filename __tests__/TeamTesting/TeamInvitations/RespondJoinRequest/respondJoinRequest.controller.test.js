const teamController = require("../../../../src/controllers/team.controller");
const teamService = require("../../../../src/services/team.service");

jest.mock("../../../../src/services/team.service");

describe("Team Controller - respondToJoinRequest", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { requestId: "req1" },
      user: { id: "leader1" },
      body: { action: "accept" },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
  });

  it("returns 200 on success", async () => {
    teamService.respondToJoinRequest.mockResolvedValue({
      success: true,
      status: "ACCEPTED",
    });

    await teamController.respondToJoinRequest(req, res);

    expect(teamService.respondToJoinRequest).toHaveBeenCalledWith({
      requestId: "req1",
      leaderId: "leader1",
      action: "accept",
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 403 on forbidden response", async () => {
    teamService.respondToJoinRequest.mockRejectedValue({
      statusCode: 403,
      message: "Only the team leader can respond to this join request.",
    });

    await teamController.respondToJoinRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Only the team leader can respond to this join request.",
    });
  });
});
