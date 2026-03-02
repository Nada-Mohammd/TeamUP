const teamController = require("../../../src/controllers/team.controller");
const teamService = require("../../../src/services/team.service");

jest.mock("../../../src/services/team.service");

describe("teamController.getCourseworkTeams", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: {
        classId: "class123",
        courseworkId: "coursework123",
      },
      query: {
        locked: "false",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test("should return teams successfully", async () => {
    const teams = [
      {
        teamName: "Alpha",
        teamMembers: [{ _id: "u1", first_name: "Nada" }],
        courseworkName: "Project 1",
        className: "Data Structures",
      },
    ];

    teamService.getCourseworkTeams.mockResolvedValue(teams);

    await teamController.getCourseworkTeams(req, res);

    expect(teamService.getCourseworkTeams).toHaveBeenCalledWith(
      "class123",
      "coursework123",
      "false",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: teams,
    });
  });

  test("should handle service errors", async () => {
    teamService.getCourseworkTeams.mockRejectedValue(
      new Error("Coursework not found."),
    );

    await teamController.getCourseworkTeams(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Coursework not found.",
    });
  });
});
