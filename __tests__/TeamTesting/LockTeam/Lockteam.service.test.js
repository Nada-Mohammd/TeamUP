const teamService = require('../../../src/services/team.service');
const Team = require('../../../src/models/Team');
const TeamMember = require('../../../src/models/TeamMembers');
const Coursework = require('../../../src/models/CourseWork');

jest.mock('../../../src/models/Team');
jest.mock('../../../src/models/TeamMembers');
jest.mock('../../../src/models/CourseWork');

describe('Team Service - lockTeam', () => {
  afterEach(() => jest.clearAllMocks());

  const teamId = 'teamId123';
  const userId = 'studentId123';
  const courseworkId = 'courseworkId123';

  const mockCoursework = {
    _id: courseworkId,
    team_size_min: 2,
  };

  const mockLeader = {
    _id: 'memberId',
    teamId,
    studentId: userId,
    role: 'LEADER',
  };

  const makeMockTeam = () => ({
    _id: teamId,
    name: 'Team Alpha',
    courseworkId,
    isLocked: false,
    save: jest.fn().mockResolvedValue(true),
  });

  // helper: catches the thrown object and returns it
  const catchError = (promise) => promise.catch((e) => e);

  // ─── 404 Not Found ───────────────────────────────────────────────

  it('throws 404 if team does not exist', async () => {
    Team.findById.mockResolvedValue(null);

    const error = await catchError(teamService.lockTeam(teamId, userId));

    expect(error.message).toBe('Team not found.');
    expect(error.statusCode).toBe(404);
  });

  it('throws 404 if coursework does not exist', async () => {
    Team.findById.mockResolvedValue(makeMockTeam());
    TeamMember.findOne.mockResolvedValue(mockLeader);
    Coursework.findById.mockResolvedValue(null);

    const error = await catchError(teamService.lockTeam(teamId, userId));

    expect(error.message).toBe('Coursework not found.');
    expect(error.statusCode).toBe(404);
  });

  // ─── 403 Forbidden ───────────────────────────────────────────────

  it('throws 403 if user is not the leader', async () => {
    Team.findById.mockResolvedValue(makeMockTeam());
    TeamMember.findOne.mockResolvedValue(null);

    const error = await catchError(teamService.lockTeam(teamId, userId));

    expect(error.message).toBe('Only the team leader can lock the team.');
    expect(error.statusCode).toBe(403);
  });

  // ─── 400 Bad Request ─────────────────────────────────────────────

  it('throws 400 if current member count is less than team_size_min', async () => {
    Team.findById.mockResolvedValue(makeMockTeam());
    TeamMember.findOne.mockResolvedValue(mockLeader);
    Coursework.findById.mockResolvedValue({ ...mockCoursework, team_size_min: 3 });
    TeamMember.countDocuments.mockResolvedValue(1);

    const error = await catchError(teamService.lockTeam(teamId, userId));

    expect(error.message).toBe(
      'Team must have at least 3 members to be locked. Current members: 1.'
    );
    expect(error.statusCode).toBe(400);
  });

  it('throws 400 and shows correct numbers in message when count is 0', async () => {
    Team.findById.mockResolvedValue(makeMockTeam());
    TeamMember.findOne.mockResolvedValue(mockLeader);
    Coursework.findById.mockResolvedValue({ ...mockCoursework, team_size_min: 2 });
    TeamMember.countDocuments.mockResolvedValue(0);

    const error = await catchError(teamService.lockTeam(teamId, userId));

    expect(error.message).toContain('at least 2 members');
    expect(error.message).toContain('Current members: 0');
    expect(error.statusCode).toBe(400);
  });

  // ─── Success ─────────────────────────────────────────────────────

  it('locks the team successfully when member count exactly meets team_size_min', async () => {
    const mockTeam = makeMockTeam();
    Team.findById.mockResolvedValue(mockTeam);
    TeamMember.findOne.mockResolvedValue(mockLeader);
    Coursework.findById.mockResolvedValue({ ...mockCoursework, team_size_min: 2 });
    TeamMember.countDocuments.mockResolvedValue(2);

    const result = await teamService.lockTeam(teamId, userId);

    expect(result.isLocked).toBe(true);
    expect(mockTeam.save).toHaveBeenCalledTimes(1);
  });

  it('locks the team when member count exceeds team_size_min', async () => {
    const mockTeam = makeMockTeam();
    Team.findById.mockResolvedValue(mockTeam);
    TeamMember.findOne.mockResolvedValue(mockLeader);
    Coursework.findById.mockResolvedValue({ ...mockCoursework, team_size_min: 2 });
    TeamMember.countDocuments.mockResolvedValue(4);

    const result = await teamService.lockTeam(teamId, userId);

    expect(result.isLocked).toBe(true);
    expect(mockTeam.save).toHaveBeenCalledTimes(1);
  });

  it('calls countDocuments with the correct teamId', async () => {
    const mockTeam = makeMockTeam();
    Team.findById.mockResolvedValue(mockTeam);
    TeamMember.findOne.mockResolvedValue(mockLeader);
    Coursework.findById.mockResolvedValue({ ...mockCoursework, team_size_min: 2 });
    TeamMember.countDocuments.mockResolvedValue(2);

    await teamService.lockTeam(teamId, userId);

    expect(TeamMember.countDocuments).toHaveBeenCalledWith({ teamId });
  });

  it('fetches coursework using the team courseworkId', async () => {
    const mockTeam = makeMockTeam();
    Team.findById.mockResolvedValue(mockTeam);
    TeamMember.findOne.mockResolvedValue(mockLeader);
    Coursework.findById.mockResolvedValue({ ...mockCoursework, team_size_min: 2 });
    TeamMember.countDocuments.mockResolvedValue(2);

    await teamService.lockTeam(teamId, userId);

    expect(Coursework.findById).toHaveBeenCalledWith(courseworkId);
  });

  it('returns the updated team object after locking', async () => {
    const mockTeam = makeMockTeam();
    Team.findById.mockResolvedValue(mockTeam);
    TeamMember.findOne.mockResolvedValue(mockLeader);
    Coursework.findById.mockResolvedValue({ ...mockCoursework, team_size_min: 2 });
    TeamMember.countDocuments.mockResolvedValue(3);

    const result = await teamService.lockTeam(teamId, userId);

    expect(result._id).toBe(teamId);
    expect(result.name).toBe('Team Alpha');
    expect(result.isLocked).toBe(true);
  });
});