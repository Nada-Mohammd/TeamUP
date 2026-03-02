const teamController = require('../../../src/controllers/team.controller');
const teamService = require('../../../src/services/team.service');

jest.mock('../../../src/services/team.service');

describe('Team Controller - lockTeam', () => {
  let req;
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    req = {
      params: { teamId: 'teamId123' },
      user: { id: 'studentId123' },
    };

    jest.clearAllMocks();
  });

  it('returns 200 and the locked team on success', async () => {
    const fakeTeam = {
      _id: 'teamId123',
      name: 'Team Alpha',
      isLocked: true,
    };

    teamService.lockTeam.mockResolvedValue(fakeTeam);

    await teamController.lockTeam(req, res);

    expect(teamService.lockTeam).toHaveBeenCalledWith('teamId123', 'studentId123');

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Team locked successfully.',
      team: expect.objectContaining({
        _id: 'teamId123',
        isLocked: true,
      }),
    });
  });

  

  it('returns 400 if team does not meet minimum member count', async () => {
    teamService.lockTeam.mockRejectedValue({
      message: 'Team must have at least 2 members to be locked. Current members: 1.',
      statusCode: 400,
    });

    await teamController.lockTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Team must have at least 2 members to be locked. Current members: 1.',
    });
  });


  it('returns 403 if user is not the leader', async () => {
    teamService.lockTeam.mockRejectedValue({
      message: 'Only the team leader can lock the team.',
      statusCode: 403,
    });

    await teamController.lockTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Only the team leader can lock the team.',
    });
  });


  it('returns 404 if team not found', async () => {
    teamService.lockTeam.mockRejectedValue({
      message: 'Team not found.',
      statusCode: 404,
    });

    await teamController.lockTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Team not found.',
    });
  });

  it('returns 404 if coursework not found', async () => {
    teamService.lockTeam.mockRejectedValue({
      message: 'Coursework not found.',
      statusCode: 404,
    });

    await teamController.lockTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Coursework not found.',
    });
  });

 

  it('returns 500 if an unexpected error occurs with no statusCode', async () => {
    teamService.lockTeam.mockRejectedValue(
      new Error('Unexpected database failure')
    );

    await teamController.lockTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unexpected database failure',
    });
  });
});