// __tests__/TeamTesting/KickStudentFromTeam/KickStudentFromTeam.service.test.js

const teamService = require('../../../src/services/team.service');
const Team = require('../../../src/models/Team');
const TeamMember = require('../../../src/models/TeamMembers');
const Coursework = require('../../../src/models/CourseWork');
const User = require('../../../src/models/User');
const Class = require('../../../src/models/Class');
const Notification = require('../../../src/models/Notification');

jest.mock('../../../src/models/Team');
jest.mock('../../../src/models/TeamMembers'); 
jest.mock('../../../src/models/CourseWork');
jest.mock('../../../src/models/User');
jest.mock('../../../src/models/Class');
jest.mock('../../../src/models/Notification');

describe('Team Service - kickStudentFromTeam', () => {
  afterEach(() => jest.clearAllMocks());

  const teamId = '69dd585f61bbe9d5c9dc2957';
  const studentId = '69dd589161bbe9d5c9dc295f';
  const instructorId = 'instructorId123';
  const courseworkId = '69dd585f61bbe9d5c9dc2958';
  const classId = '69dd585f61bbe9d5c9dc2957';

  const mockTeam = {
    _id: teamId,
    name: 'Big Data Assignment1',
    courseworkId,
    classId,
    instructorId,
    leaderId: studentId,
    size: 4,
    isLocked: false,
  };

  const mockCoursework = {
    _id: courseworkId,
    name: 'Assignment 2',
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    isDeleted: false,
  };

  const mockClass = {
    _id: classId,
    course_name: 'Big Data',
    course_code: 'IS321',
    class_color: '#FF5733',
  };

  const mockInstructor = {
    _id: instructorId,
    first_name: 'Nada',
    last_name: 'Mohammed',
    email: 'nda@gmail.com',
  };

  const mockStudent = {
    _id: studentId,
    first_name: 'Ahmed',
    last_name: 'Ali',
    email: '20221175@stud.fci-cu.edu.eg',
  };

  // Helper: catches the thrown object and returns it
  const catchError = (promise) => promise.catch((e) => e);

  // ─── Validation: Team Exists (404) ───────────────────────────────

  it('throws 404 if team not found', async () => {
    Team.findById.mockResolvedValue(null);

    const error = await catchError(
      teamService.kickStudentFromTeam({ teamId, studentId, instructorId })
    );
    expect(error.message).toBe('Team not found.');
    expect(error.statusCode).toBe(404);
  });

  // ─── Validation: Instructor Assignment (403) ─────────────────────

  it('throws 403 if instructorId is null on team', async () => {
    Team.findById.mockResolvedValue({ ...mockTeam, instructorId: null });

    const error = await catchError(
      teamService.kickStudentFromTeam({ teamId, studentId, instructorId })
    );
    expect(error.message).toBe('You are not assigned as instructor for this team.');
    expect(error.statusCode).toBe(403);
  });

  it('throws 403 if instructorId does not match', async () => {
    Team.findById.mockResolvedValue({
      ...mockTeam,
      instructorId: 'differentInstructorId',
    });

    const error = await catchError(
      teamService.kickStudentFromTeam({ teamId, studentId, instructorId })
    );
    expect(error.message).toBe('You are not assigned as instructor for this team.');
    expect(error.statusCode).toBe(403);
  });

  // ─── Validation: Coursework Exists (404) ─────────────────────────

  it('throws 404 if coursework not found', async () => {
    Team.findById.mockResolvedValue(mockTeam);
    Coursework.findById.mockResolvedValue(null);

    const error = await catchError(
      teamService.kickStudentFromTeam({ teamId, studentId, instructorId })
    );
    expect(error.message).toBe('Coursework not found.');
    expect(error.statusCode).toBe(404);
  });

  // ─── Validation: Deadline Check (400) ────────────────────────────

  it('throws 400 if deadline is exactly 5 days away', async () => {
    Team.findById.mockResolvedValue(mockTeam);
    Coursework.findById.mockResolvedValue({
      ...mockCoursework,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // exactly 5 days
    });

    const error = await catchError(
      teamService.kickStudentFromTeam({ teamId, studentId, instructorId })
    );
    expect(error.message).toBe(
      'Cannot remove student when 5 days or less remain before deadline.'
    );
    expect(error.statusCode).toBe(400);
  });

  it('throws 400 if deadline is less than 5 days away', async () => {
    Team.findById.mockResolvedValue(mockTeam);
    Coursework.findById.mockResolvedValue({
      ...mockCoursework,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    });

    const error = await catchError(
      teamService.kickStudentFromTeam({ teamId, studentId, instructorId })
    );
    expect(error.message).toBe(
      'Cannot remove student when 5 days or less remain before deadline.'
    );
    expect(error.statusCode).toBe(400);
  });

  it('throws 400 if deadline has passed', async () => {
    Team.findById.mockResolvedValue(mockTeam);
    Coursework.findById.mockResolvedValue({
      ...mockCoursework,
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday
    });

    const error = await catchError(
      teamService.kickStudentFromTeam({ teamId, studentId, instructorId })
    );
    expect(error.message).toBe(
      'Cannot remove student when 5 days or less remain before deadline.'
    );
    expect(error.statusCode).toBe(400);
  });

  // ─── Validation: Student Membership (404) ────────────────────────

  it('throws 404 if student is not in this team', async () => {
    Team.findById.mockResolvedValue(mockTeam);
    Coursework.findById.mockResolvedValue(mockCoursework);
    TeamMember.findOne.mockResolvedValue(null);

    const error = await catchError(
      teamService.kickStudentFromTeam({ teamId, studentId, instructorId })
    );
    expect(error.message).toBe('Student is not in this team.');
    expect(error.statusCode).toBe(404);
  });

  // ─── Success: Kick Member (Not Leader) ──────────────

  it('removes member successfully (without testing notification)', async () => {
    // Setup mocks - use mockReturnValue to handle .select() chaining
    Team.findById.mockResolvedValue(mockTeam);
    Coursework.findById.mockResolvedValue(mockCoursework);
    Class.findById.mockResolvedValue(mockClass);
    
    // Mock User.findById().select() to return mock data directly
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockInstructor),
    });
    
    TeamMember.findOne.mockResolvedValue({
      teamId,
      studentId,
      role: 'MEMBER',
    });
    TeamMember.deleteOne.mockResolvedValue({ deletedCount: 1 });
    // Skip mocking Notification.create to avoid testing notification logic

    const result = await teamService.kickStudentFromTeam({
      teamId,
      studentId,
      instructorId,
    });

    // Verify student was removed
    expect(TeamMember.deleteOne).toHaveBeenCalledWith({
      teamId,
      studentId,
    });

    expect(result).toBe(true);
  });

  // ─── Success: Kick Leader + Reassign New Leader  ─────

  it('kicks leader and assigns new leader randomly (without notification test)', async () => {
    const otherMemberId = 'otherMemberId456';
    const mockOtherMember = {
      _id: 'memberDocId',
      studentId: otherMemberId,
      role: 'MEMBER',
    };

    // Setup mocks
    Team.findById.mockResolvedValue(mockTeam);
    Coursework.findById.mockResolvedValue(mockCoursework);
    Class.findById.mockResolvedValue(mockClass);
    
    // Mock User.findById().select() chaining
    User.findById.mockImplementation(() => ({
      select: jest.fn().mockResolvedValue(mockInstructor),
    }));

    // Kicked student is LEADER
    TeamMember.findOne.mockResolvedValueOnce({
      teamId,
      studentId,
      role: 'LEADER',
    });

    // Find other members for reassignment
    TeamMember.find.mockResolvedValue([mockOtherMember]);

    // Mock random to always pick index 0 for predictable testing
    const originalRandom = Math.random;
    Math.random = jest.fn(() => 0.5);

    TeamMember.findByIdAndUpdate.mockResolvedValue({
      _id: 'memberDocId',
      studentId: otherMemberId,
      role: 'LEADER',
    });

    TeamMember.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const result = await teamService.kickStudentFromTeam({
      teamId,
      studentId,
      instructorId,
    });

    // Verify new leader was assigned
    expect(TeamMember.findByIdAndUpdate).toHaveBeenCalledWith(
      'memberDocId',
      { $set: { role: 'LEADER' } },
      { new: true }
    );

    // Verify kicked student was removed
    expect(TeamMember.deleteOne).toHaveBeenCalledWith({
      teamId,
      studentId,
    });

    expect(result).toBe(true);

    // Restore Math.random
    Math.random = originalRandom;
  });

  // ─── Edge Case: Kick Leader When No Other Members ────────────────

  it('deletes team if leader is kicked and no other members exist', async () => {
    Team.findById.mockResolvedValue(mockTeam);
    Coursework.findById.mockResolvedValue(mockCoursework);
    Class.findById.mockResolvedValue(mockClass);
    
    // Mock User.findById().select() chaining
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockInstructor),
    });

    // Kicked student is LEADER
    TeamMember.findOne.mockResolvedValueOnce({
      teamId,
      studentId,
      role: 'LEADER',
    });

    // No other members
    TeamMember.find.mockResolvedValue([]);

    TeamMember.deleteOne.mockResolvedValue({ deletedCount: 1 });
    Team.findByIdAndDelete.mockResolvedValue(mockTeam);

    const result = await teamService.kickStudentFromTeam({
      teamId,
      studentId,
      instructorId,
    });

    // Verify team was deleted
    expect(Team.findByIdAndDelete).toHaveBeenCalledWith(teamId);

    // Verify kicked student was removed
    expect(TeamMember.deleteOne).toHaveBeenCalledWith({
      teamId,
      studentId,
    });

    expect(result).toBe(true);
  });

  
});