const teamController = require('../../../src/controllers/team.controller');
const teamService = require('../../../src/services/team.service');

jest.mock('../../../src/services/team.service');

describe('Team Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    req = {
      user: { id: 'studentId' },
      body: {
        name: 'Team Alpha',
        courseworkId: '69786145f373bb543a5da1b5',
      },
    };

    jest.clearAllMocks();
  });

  describe('createTeam', () => {

    // ─── Success ─────────────────────────────────────────────────────

    it('creates a team successfully and returns 201', async () => {
      const fakeTeam = {
        _id: 'teamId',
        name: 'Team Alpha',
        courseworkId: '69786145f373bb543a5da1b5',
        classId: 'classId',
        leaderId: 'studentId',
        size: 5,
        isLocked: false,
      };

      teamService.createTeam.mockResolvedValue(fakeTeam);

      await teamController.createTeam(req, res);

      expect(teamService.createTeam).toHaveBeenCalledWith(
        'studentId',
        expect.objectContaining({
          name: 'Team Alpha',
          courseworkId: '69786145f373bb543a5da1b5',
        })
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Team created successfully.',
        data: expect.objectContaining({
          _id: 'teamId',
          name: 'Team Alpha',
          leaderId: 'studentId',
        }),
      });
    });

    // ─── 400 Bad Request ─────────────────────────────────────────────

    it('returns 400 if team name is missing', async () => {
      teamService.createTeam.mockRejectedValue({
        message: 'Team name is required.',
        statusCode: 400,
      });

      await teamController.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Team name is required.',
      });
    });

    it('returns 400 if courseworkId is missing', async () => {
      teamService.createTeam.mockRejectedValue({
        message: 'Coursework ID is required.',
        statusCode: 400,
      });

      await teamController.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Coursework ID is required.',
      });
    });

    // ─── 403 Forbidden ───────────────────────────────────────────────

    it('returns 403 if user is not a student', async () => {
      teamService.createTeam.mockRejectedValue({
        message: 'Only students can create teams.',
        statusCode: 403,
      });

      await teamController.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only students can create teams.',
      });
    });

    it('returns 403 if student is not a member of the class', async () => {
      teamService.createTeam.mockRejectedValue({
        message: 'You are not a member of this class.',
        statusCode: 403,
      });

      await teamController.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are not a member of this class.',
      });
    });

    // ─── 404 Not Found ───────────────────────────────────────────────

    it('returns 404 if coursework not found', async () => {
      teamService.createTeam.mockRejectedValue({
        message: 'Coursework not found.',
        statusCode: 404,
      });

      await teamController.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Coursework not found.',
      });
    });

    it('returns 404 if user not found', async () => {
      teamService.createTeam.mockRejectedValue({
        message: 'User not found.',
        statusCode: 404,
      });

      await teamController.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found.',
      });
    });

    // ─── 409 Conflict ────────────────────────────────────────────────

    it('returns 409 if student already has a team for this coursework', async () => {
      teamService.createTeam.mockRejectedValue({
        message: 'You are already part of a team for this coursework.',
        statusCode: 409,
      });

      await teamController.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are already part of a team for this coursework.',
      });
    });

    // ─── 500 Internal Server Error ───────────────────────────────────

    it('returns 500 if an unexpected error occurs with no statusCode', async () => {
      teamService.createTeam.mockRejectedValue(
        new Error('Unexpected database failure')
      );

      await teamController.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unexpected database failure',
      });
    });
  });
});