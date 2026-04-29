const teamController = require('../../../src/controllers/team.controller');
const teamService = require('../../../src/services/team.service');

jest.mock('../../../src/services/team.service');

describe('Team Controller - kickStudentFromTeam', () => {
  let req;
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    req = {
      user: { id: 'instructorId123' },
      params: {
        teamId: '69dd585f61bbe9d5c9dc2957',
        studentId: '69dd589161bbe9d5c9dc295f',
      },
    };

    jest.clearAllMocks();
  });

  // ─── Success ─────────────────────────────────────────────────────

  it('kicks student from team successfully and returns 200', async () => {
    teamService.kickStudentFromTeam.mockResolvedValue(true);

    await teamController.kickStudentFromTeam(req, res);

    expect(teamService.kickStudentFromTeam).toHaveBeenCalledWith({
      teamId: '69dd585f61bbe9d5c9dc2957',
      studentId: '69dd589161bbe9d5c9dc295f',
      instructorId: 'instructorId123',
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Student kicked from team successfully.',
    });
  });

  // ─── 400 Bad Request ─────────────────────────────────────────────

  it('returns 400 if deadline is 5 days or less', async () => {
    teamService.kickStudentFromTeam.mockRejectedValue({
      message: 'Cannot remove student when 5 days or less remain before deadline.',
      statusCode: 400,
    });

    await teamController.kickStudentFromTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Cannot remove student when 5 days or less remain before deadline.',
    });
  });

  // ─── 403 Forbidden ───────────────────────────────────────────────

  it('returns 403 if instructor is not assigned to this team', async () => {
    teamService.kickStudentFromTeam.mockRejectedValue({
      message: 'You are not assigned as instructor for this team.',
      statusCode: 403,
    });

    await teamController.kickStudentFromTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'You are not assigned as instructor for this team.',
    });
  });

  // ─── 404 Not Found ───────────────────────────────────────────────

  it('returns 404 if team not found', async () => {
    teamService.kickStudentFromTeam.mockRejectedValue({
      message: 'Team not found.',
      statusCode: 404,
    });

    await teamController.kickStudentFromTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Team not found.',
    });
  });

  it('returns 404 if coursework not found', async () => {
    teamService.kickStudentFromTeam.mockRejectedValue({
      message: 'Coursework not found.',
      statusCode: 404,
    });

    await teamController.kickStudentFromTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Coursework not found.',
    });
  });

  it('returns 404 if student is not in this team', async () => {
    teamService.kickStudentFromTeam.mockRejectedValue({
      message: 'Student is not in this team.',
      statusCode: 404,
    });

    await teamController.kickStudentFromTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Student is not in this team.',
    });
  });

 
});