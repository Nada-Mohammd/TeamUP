const teamService = require('../../../src/services/team.service');
const Team = require('../../../src/models/Team');
const TeamMember = require('../../../src/models/TeamMembers');
const Coursework = require('../../../src/models/CourseWork');
const ClassProfile = require('../../../src/models/ClassProfile');
const User = require('../../../src/models/User');

jest.mock('../../../src/models/Team');
jest.mock('../../../src/models/TeamMembers');
jest.mock('../../../src/models/CourseWork');
jest.mock('../../../src/models/ClassProfile');
jest.mock('../../../src/models/User');

describe('Team Service', () => {
  afterEach(() => jest.clearAllMocks());

  describe('createTeam', () => {
    const userId = 'studentId';
    const courseworkId = '69786145f373bb543a5da1b5';
    const classId = 'classId';

    const teamData = {
      name: 'Team Alpha',
      courseworkId,
    };

    const mockStudent = { _id: userId, role: 'Student' };
    const mockCoursework = {
      _id: courseworkId,
      classId,
      isDeleted: false,
      team_size_max: 5,
    };
    const mockMembership = { classId, userId };

    // helper: catches the thrown object and returns it
    const catchError = (promise) => promise.catch((e) => e);

    // ─── Validation (400) ────────────────────────────────────────────

    it('throws 400 if team name is missing', async () => {
      const error = await catchError(
        teamService.createTeam(userId, { name: '', courseworkId })
      );
      expect(error.message).toBe('Team name is required.');
      expect(error.statusCode).toBe(400);
    });

    it('throws 400 if team name is whitespace only', async () => {
      const error = await catchError(
        teamService.createTeam(userId, { name: '   ', courseworkId })
      );
      expect(error.message).toBe('Team name is required.');
      expect(error.statusCode).toBe(400);
    });

    it('throws 400 if courseworkId is missing', async () => {
      const error = await catchError(
        teamService.createTeam(userId, { name: 'Team Alpha', courseworkId: undefined })
      );
      expect(error.message).toBe('Coursework ID is required.');
      expect(error.statusCode).toBe(400);
    });

    // ─── Not Found (404) ─────────────────────────────────────────────

    it('throws 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);

      const error = await catchError(teamService.createTeam(userId, teamData));
      expect(error.message).toBe('User not found.');
      expect(error.statusCode).toBe(404);
    });

    it('throws 404 if coursework not found', async () => {
      User.findById.mockResolvedValue(mockStudent);
      Coursework.findById.mockResolvedValue(null);

      const error = await catchError(teamService.createTeam(userId, teamData));
      expect(error.message).toBe('Coursework not found.');
      expect(error.statusCode).toBe(404);
    });

    it('throws 404 if coursework is deleted', async () => {
      User.findById.mockResolvedValue(mockStudent);
      Coursework.findById.mockResolvedValue({ ...mockCoursework, isDeleted: true });

      const error = await catchError(teamService.createTeam(userId, teamData));
      expect(error.message).toBe('Coursework not found.');
      expect(error.statusCode).toBe(404);
    });

    // ─── Forbidden (403) ─────────────────────────────────────────────

    it('throws 403 if user is not a student', async () => {
      User.findById.mockResolvedValue({ _id: userId, role: 'Instructor' });

      const error = await catchError(teamService.createTeam(userId, teamData));
      expect(error.message).toBe('Only students can create teams.');
      expect(error.statusCode).toBe(403);
    });

    it('throws 403 if student is not a member of the class', async () => {
      User.findById.mockResolvedValue(mockStudent);
      Coursework.findById.mockResolvedValue(mockCoursework);
      ClassProfile.findOne.mockResolvedValue(null);

      const error = await catchError(teamService.createTeam(userId, teamData));
      expect(error.message).toBe('You are not a member of this class.');
      expect(error.statusCode).toBe(403);
    });

    // ─── Conflict (409) ──────────────────────────────────────────────

    it('throws 409 if student already leads a team for this coursework', async () => {
      User.findById.mockResolvedValue(mockStudent);
      Coursework.findById.mockResolvedValue(mockCoursework);
      ClassProfile.findOne.mockResolvedValue(mockMembership);
      Team.findOne.mockResolvedValue({ _id: 'existingTeamId' });
      TeamMember.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ teamId: null }),
      });

      const error = await catchError(teamService.createTeam(userId, teamData));
      expect(error.message).toBe('You are already part of a team for this coursework.');
      expect(error.statusCode).toBe(409);
    });

    it('throws 409 if student is already a member of a team for this coursework', async () => {
      User.findById.mockResolvedValue(mockStudent);
      Coursework.findById.mockResolvedValue(mockCoursework);
      ClassProfile.findOne.mockResolvedValue(mockMembership);
      Team.findOne.mockResolvedValue(null);
      TeamMember.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          teamId: { _id: 'anotherTeamId', courseworkId },
        }),
      });

      const error = await catchError(teamService.createTeam(userId, teamData));
      expect(error.message).toBe('You are already part of a team for this coursework.');
      expect(error.statusCode).toBe(409);
    });

    // ─── Success (201) ───────────────────────────────────────────────

    it('creates team and adds student as LEADER successfully', async () => {
      User.findById.mockResolvedValue(mockStudent);
      Coursework.findById.mockResolvedValue(mockCoursework);
      ClassProfile.findOne.mockResolvedValue(mockMembership);
      Team.findOne.mockResolvedValue(null);
      TeamMember.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ teamId: null }),
      });

      const newTeam = {
        _id: 'newTeamId',
        name: 'Team Alpha',
        courseworkId,
        classId,
        leaderId: userId,
        size: 5,
        isLocked: false,
      };

      Team.create.mockResolvedValue(newTeam);
      TeamMember.create.mockResolvedValue({
        _id: 'teamMemberId',
        teamId: 'newTeamId',
        studentId: userId,
        role: 'LEADER',
      });

      const result = await teamService.createTeam(userId, teamData);

      expect(Team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Team Alpha',
          courseworkId,
          classId,
          leaderId: userId,
          size: 5,
        })
      );

      expect(TeamMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 'newTeamId',
          studentId: userId,
          role: 'LEADER',
        })
      );

      expect(result._id).toBe('newTeamId');
      expect(result.leaderId).toBe(userId);
    });

    it('trims the team name before creation', async () => {
      User.findById.mockResolvedValue(mockStudent);
      Coursework.findById.mockResolvedValue(mockCoursework);
      ClassProfile.findOne.mockResolvedValue(mockMembership);
      Team.findOne.mockResolvedValue(null);
      TeamMember.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ teamId: null }),
      });
      Team.create.mockResolvedValue({ _id: 'newTeamId', name: 'Team Alpha' });
      TeamMember.create.mockResolvedValue({});

      await teamService.createTeam(userId, { name: '  Team Alpha  ', courseworkId });

      expect(Team.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Team Alpha' })
      );
    });
  });
});