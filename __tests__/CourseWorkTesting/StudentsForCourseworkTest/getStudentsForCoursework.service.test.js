const mongoose = require('mongoose');
const { getAvailableStudents } = require('../../../src/services/coursework.service');

// ── Mock all DB models ────────────────────────────────────────────────────────
jest.mock('../../../src/models/ClassProfile');
jest.mock('../../../src/models/Team');
jest.mock('../../../src/models/TeamMembers');
jest.mock('../../../src/models/User');
jest.mock('../../../src/models/StudentProfile');
jest.mock('../../../src/models/TeamJoinRequest');

const ClassProfile    = require('../../../src/models/ClassProfile');
const Team            = require('../../../src/models/Team');
const TeamMember      = require('../../../src/models/TeamMembers');
const User            = require('../../../src/models/User');
const StudentProfile  = require('../../../src/models/StudentProfile');
const TeamJoinRequest = require('../../../src/models/TeamJoinRequest');

// ── Shared test IDs ───────────────────────────────────────────────────────────
const validCwId  = new mongoose.Types.ObjectId().toString();
const classId    = new mongoose.Types.ObjectId();
const userId     = new mongoose.Types.ObjectId();
const teamId     = new mongoose.Types.ObjectId();
const studentId1 = new mongoose.Types.ObjectId();
const studentId2 = new mongoose.Types.ObjectId();

// ── Chainable Mongoose mock builder ──────────────────────────────────────────
const mockChain = (resolvedValue) => ({
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(resolvedValue),
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('getAvailableStudents service', () => {
  afterEach(() => jest.clearAllMocks());

  // ── 1. No students enrolled in class ──────────────────────────────────────
  it('throws if no students are enrolled in the class', async () => {
    ClassProfile.find = jest.fn().mockReturnValue(mockChain([]));

    await expect(
      getAvailableStudents(validCwId, classId, userId, teamId)
    ).rejects.toThrow('No students are enrolled in this class.');
  });

  // ── 2. No teams exist yet — all students available, no invitations ─────────
  it('returns all enrolled students with invitation_status null when no teams exist', async () => {
    ClassProfile.find = jest.fn().mockReturnValue(
      mockChain([{ userId: studentId1 }, { userId: studentId2 }])
    );
    Team.find = jest.fn().mockReturnValue(mockChain([]));
    User.find = jest.fn().mockReturnValue(
      mockChain([
        { _id: studentId1, first_name: 'Alice', last_name: 'Smith', email: 'alice@stud.fci-cu.edu.eg' },
        { _id: studentId2, first_name: 'Bob',   last_name: 'Jones', email: 'bob@stud.fci-cu.edu.eg'   },
      ])
    );
    StudentProfile.find   = jest.fn().mockReturnValue(mockChain([]));
    TeamJoinRequest.find  = jest.fn().mockReturnValue(mockChain([]));

    const result = await getAvailableStudents(validCwId, classId, userId, teamId);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ first_name: 'Alice', invitation_status: null });
    expect(result[1]).toMatchObject({ first_name: 'Bob',   invitation_status: null });
  });

  // ── 3. Some students already in teams — only available ones returned ───────
  it('excludes students who are already in a team', async () => {
    ClassProfile.find = jest.fn().mockReturnValue(
      mockChain([{ userId: studentId1 }, { userId: studentId2 }])
    );
    Team.find = jest.fn().mockReturnValue(mockChain([{ _id: teamId }]));
    TeamMember.find = jest.fn().mockReturnValue(
      mockChain([{ studentId: studentId1 }]) // studentId1 is already in a team
    );
    User.find = jest.fn().mockReturnValue(
      mockChain([
        { _id: studentId2, first_name: 'Bob', last_name: 'Jones', email: 'bob@stud.fci-cu.edu.eg' },
      ])
    );
    StudentProfile.find  = jest.fn().mockReturnValue(mockChain([]));
    TeamJoinRequest.find = jest.fn().mockReturnValue(mockChain([]));

    const result = await getAvailableStudents(validCwId, classId, userId, teamId);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ first_name: 'Bob' });
  });

  // ── 4. All students in teams — returns empty array ────────────────────────
  it('returns empty array when all students have joined teams', async () => {
    ClassProfile.find = jest.fn().mockReturnValue(
      mockChain([{ userId: studentId1 }])
    );
    Team.find = jest.fn().mockReturnValue(mockChain([{ _id: teamId }]));
    TeamMember.find = jest.fn().mockReturnValue(
      mockChain([{ studentId: studentId1 }])
    );

    const result = await getAvailableStudents(validCwId, classId, userId, teamId);

    expect(result).toEqual([]);
    expect(User.find).not.toHaveBeenCalled();
    expect(StudentProfile.find).not.toHaveBeenCalled();
    expect(TeamJoinRequest.find).not.toHaveBeenCalled();
  });

  // ── 5. Profile picture attached when StudentProfile exists ────────────────
  it('attaches profile_picture from StudentProfile when it exists', async () => {
    const profilePicture = { filename: 'alice.png', storagePath: '/uploads/alice.png', uploadedAt: new Date() };

    ClassProfile.find = jest.fn().mockReturnValue(mockChain([{ userId: studentId1 }]));
    Team.find         = jest.fn().mockReturnValue(mockChain([]));
    User.find         = jest.fn().mockReturnValue(
      mockChain([{ _id: studentId1, first_name: 'Alice', last_name: 'Smith', email: 'alice@stud.fci-cu.edu.eg' }])
    );
    StudentProfile.find  = jest.fn().mockReturnValue(
      mockChain([{ user_id: studentId1, profile_picture: profilePicture }])
    );
    TeamJoinRequest.find = jest.fn().mockReturnValue(mockChain([]));

    const result = await getAvailableStudents(validCwId, classId, userId, teamId);

    expect(result[0].profile_picture).toEqual(profilePicture);
  });

  // ── 6. profile_picture is null when no StudentProfile exists ──────────────
  it('sets profile_picture to null when no StudentProfile exists for the user', async () => {
    ClassProfile.find    = jest.fn().mockReturnValue(mockChain([{ userId: studentId1 }]));
    Team.find            = jest.fn().mockReturnValue(mockChain([]));
    User.find            = jest.fn().mockReturnValue(
      mockChain([{ _id: studentId1, first_name: 'Alice', last_name: 'Smith', email: 'alice@stud.fci-cu.edu.eg' }])
    );
    StudentProfile.find  = jest.fn().mockReturnValue(mockChain([]));
    TeamJoinRequest.find = jest.fn().mockReturnValue(mockChain([]));

    const result = await getAvailableStudents(validCwId, classId, userId, teamId);

    expect(result[0].profile_picture).toBeNull();
  });

  // ── 7. TeamMember not queried when no teams exist ─────────────────────────
  it('does not query TeamMember when no teams exist for the coursework', async () => {
    ClassProfile.find    = jest.fn().mockReturnValue(mockChain([{ userId: studentId1 }]));
    Team.find            = jest.fn().mockReturnValue(mockChain([]));
    User.find            = jest.fn().mockReturnValue(
      mockChain([{ _id: studentId1, first_name: 'Alice', last_name: 'Smith', email: 'alice@stud.fci-cu.edu.eg' }])
    );
    StudentProfile.find  = jest.fn().mockReturnValue(mockChain([]));
    TeamJoinRequest.find = jest.fn().mockReturnValue(mockChain([]));

    await getAvailableStudents(validCwId, classId, userId, teamId);

    expect(TeamMember.find).not.toHaveBeenCalled();
  });

  // ── 8. PENDING invitation status patched onto matched student ─────────────
  it('sets invitation_status to PENDING for a student with a pending invitation', async () => {
    ClassProfile.find = jest.fn().mockReturnValue(mockChain([{ userId: studentId1 }]));
    Team.find         = jest.fn().mockReturnValue(mockChain([]));
    User.find         = jest.fn().mockReturnValue(
      mockChain([{ _id: studentId1, first_name: 'Alice', last_name: 'Smith', email: 'alice@stud.fci-cu.edu.eg' }])
    );
    StudentProfile.find  = jest.fn().mockReturnValue(mockChain([]));
    TeamJoinRequest.find = jest.fn().mockReturnValue(
      mockChain([{ receiverId: studentId1, status: 'PENDING' }])
    );

    const result = await getAvailableStudents(validCwId, classId, userId, teamId);

    expect(result[0].invitation_status).toBe('PENDING');
  });

  // ── 9. REJECTED invitation status patched onto matched student ────────────
  it('sets invitation_status to REJECTED for a student who declined', async () => {
    ClassProfile.find = jest.fn().mockReturnValue(mockChain([{ userId: studentId1 }]));
    Team.find         = jest.fn().mockReturnValue(mockChain([]));
    User.find         = jest.fn().mockReturnValue(
      mockChain([{ _id: studentId1, first_name: 'Alice', last_name: 'Smith', email: 'alice@stud.fci-cu.edu.eg' }])
    );
    StudentProfile.find  = jest.fn().mockReturnValue(mockChain([]));
    TeamJoinRequest.find = jest.fn().mockReturnValue(
      mockChain([{ receiverId: studentId1, status: 'REJECTED' }])
    );

    const result = await getAvailableStudents(validCwId, classId, userId, teamId);

    expect(result[0].invitation_status).toBe('REJECTED');
  });

  // ── 10. invitation_status stays null when no invitations sent ─────────────
  it('leaves invitation_status null when no invitations have been sent', async () => {
    ClassProfile.find    = jest.fn().mockReturnValue(mockChain([{ userId: studentId1 }]));
    Team.find            = jest.fn().mockReturnValue(mockChain([]));
    User.find            = jest.fn().mockReturnValue(
      mockChain([{ _id: studentId1, first_name: 'Alice', last_name: 'Smith', email: 'alice@stud.fci-cu.edu.eg' }])
    );
    StudentProfile.find  = jest.fn().mockReturnValue(mockChain([]));
    TeamJoinRequest.find = jest.fn().mockReturnValue(mockChain([])); // no invitations

    const result = await getAvailableStudents(validCwId, classId, userId, teamId);

    expect(result[0].invitation_status).toBeNull();
  });

  // ── 11. Mixed invitation statuses across multiple students ────────────────
  it('correctly patches invitation_status for each student independently', async () => {
    ClassProfile.find = jest.fn().mockReturnValue(
      mockChain([{ userId: studentId1 }, { userId: studentId2 }])
    );
    Team.find         = jest.fn().mockReturnValue(mockChain([]));
    User.find         = jest.fn().mockReturnValue(
      mockChain([
        { _id: studentId1, first_name: 'Alice', last_name: 'Smith', email: 'alice@stud.fci-cu.edu.eg' },
        { _id: studentId2, first_name: 'Bob',   last_name: 'Jones', email: 'bob@stud.fci-cu.edu.eg'   },
      ])
    );
    StudentProfile.find  = jest.fn().mockReturnValue(mockChain([]));
    TeamJoinRequest.find = jest.fn().mockReturnValue(
      mockChain([
        { receiverId: studentId1, status: 'PENDING'  },
        // studentId2 has no invitation — stays null
      ])
    );

    const result = await getAvailableStudents(validCwId, classId, userId, teamId);

    const alice = result.find((s) => s.first_name === 'Alice');
    const bob   = result.find((s) => s.first_name === 'Bob');

    expect(alice.invitation_status).toBe('PENDING');
    expect(bob.invitation_status).toBeNull();
  });
});