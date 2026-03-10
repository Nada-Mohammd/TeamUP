const { getAvailableStudents } = require('../../../src/controllers/coursework.controller');
const courseworkService = require('../../../src/services/coursework.service');

jest.mock('../../../src/services/coursework.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Controller reads courseworkId + teamId from params, classId from req (middleware),
// and userId from req.user (authenticate middleware)
const mockReq = (courseworkId, teamId, classId = 'cls123', userId = 'user123') => ({
  params: { courseworkId, teamId },
  classId,
  user: { id: userId },
});

const makeStudents = () => [
  {
    user_id: 'uid1',
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice@stud.fci-cu.edu.eg',
    profile_picture: null,
    invitation_status: null,
  },
  {
    user_id: 'uid2',
    first_name: 'Bob',
    last_name: 'Jones',
    email: 'bob@stud.fci-cu.edu.eg',
    profile_picture: { storagePath: '/uploads/bob.png', filename: 'bob.png', uploadedAt: new Date() },
    invitation_status: 'PENDING',
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getAvailableStudents controller', () => {
  afterEach(() => jest.clearAllMocks());

  // ── 200: students available ──────────────────────────────────────────────
  it('returns 200 with student list when available students exist', async () => {
    const students = makeStudents();
    courseworkService.getAvailableStudents.mockResolvedValue(students);

    const req = mockReq('cw123', 'team123', 'cls123', 'user123');
    const res = mockRes();

    await getAvailableStudents(req, res);

    // Service must be called with courseworkId, classId, userId, and teamId
    expect(courseworkService.getAvailableStudents).toHaveBeenCalledWith(
      'cw123', 'cls123', 'user123', 'team123'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      count: 2,
      data: students,
    });
  });

  // ── 200: empty — all students in teams ──────────────────────────────────
  it('returns 200 with empty data and message when all students have joined teams', async () => {
    courseworkService.getAvailableStudents.mockResolvedValue([]);

    const req = mockReq('cw123', 'team123');
    const res = mockRes();

    await getAvailableStudents(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      count: 0,
      data: [],
      message: 'All students in this class have already joined a team.',
    });
  });

  // ── 404: no students enrolled ────────────────────────────────────────────
  it('returns 404 when service throws no students enrolled error', async () => {
    courseworkService.getAvailableStudents.mockRejectedValue(
      new Error('No students are enrolled in this class.')
    );

    const req = mockReq('cw123', 'team123');
    const res = mockRes();

    await getAvailableStudents(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'No students are enrolled in this class.',
    });
  });

  // ── 404: coursework not found — defensive catch ──────────────────────────
  it('returns 404 when service throws coursework not found error', async () => {
    courseworkService.getAvailableStudents.mockRejectedValue(
      new Error('Coursework not found.')
    );

    const req = mockReq('cw123', 'team123');
    const res = mockRes();

    await getAvailableStudents(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Coursework not found.',
    });
  });

  // ── 400: invalid coursework ID — defensive catch ─────────────────────────
  it('returns 400 when service throws invalid coursework ID format error', async () => {
    courseworkService.getAvailableStudents.mockRejectedValue(
      new Error('Invalid coursework ID format.')
    );

    const req = mockReq('not-an-id', 'team123');
    const res = mockRes();

    await getAvailableStudents(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid coursework ID format.',
    });
  });

  // ── 500: unexpected error ────────────────────────────────────────────────
  it('returns 500 for any unexpected error', async () => {
    courseworkService.getAvailableStudents.mockRejectedValue(
      new Error('Database connection lost.')
    );

    const req = mockReq('cw123', 'team123');
    const res = mockRes();

    await getAvailableStudents(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
    });
  });
});