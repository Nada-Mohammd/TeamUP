const teamController = require("../../../src/controllers/team.controller");
const teamService = require("../../../src/services/team.service");

jest.mock("../../../src/services/team.service");

describe("teamController.assignInstructorToTeam", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { teamId: "team1" },
      user: { id: "leader1" },
      body: { instructorId: "inst1" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test("returns 200 and assigned instructor data on success", async () => {
    const payload = {
      teamId: "team1",
      teamName: "Team A",
      instructor: {
        id: "inst1",
        name: "Mona Ali",
      },
    };

    teamService.assignInstructorToTeam.mockResolvedValue(payload);

    await teamController.assignInstructorToTeam(req, res);

    expect(teamService.assignInstructorToTeam).toHaveBeenCalledWith({
      teamId: "team1",
      leaderId: "leader1",
      instructorId: "inst1",
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Instructor assigned successfully.",
      data: payload,
    });
  });

  test("returns service status code when assignment fails", async () => {
    teamService.assignInstructorToTeam.mockRejectedValue({
      statusCode: 403,
      message: "Only the team leader can assign an instructor.",
    });

    await teamController.assignInstructorToTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Only the team leader can assign an instructor.",
    });
  });
});
