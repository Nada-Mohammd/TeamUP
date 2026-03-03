const teamController = require("../../../../src/controllers/team.controller");
const teamService = require("../../../../src/services/team.service");

jest.mock("../../../../src/services/team.service");

describe("Team Controller - sendJoinRequest", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { teamId: "team1" },
      user: { id: "student1" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("returns 201 on success", async () => {
    teamService.sendJoinRequest.mockResolvedValue({ _id: "req1" });

    await teamController.sendJoinRequest(req, res);

    expect(teamService.sendJoinRequest).toHaveBeenCalledWith({
      teamId: "team1",
      requesterId: "student1",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("returns service status code on error", async () => {
    teamService.sendJoinRequest.mockRejectedValue({
      statusCode: 409,
      message: "A pending join request already exists.",
    });

    await teamController.sendJoinRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "A pending join request already exists.",
    });
  });
});
