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

// Controller now reads both req.params.courseworkId and req.classId (set by middleware)
const mockReq = (courseworkId, classId = 'cls123') => ({
  params: { courseworkId },
  classId,
});

const makeStudents = () => [
  {
    user_id: 'uid1',
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice@stud.fci-cu.edu.eg',
    profile_picture: null,
  },
  {
    user_id: 'uid2',
    first_name: 'Bob',
    last_name: 'Jones',
    email: 'bob@stud.fci-cu.edu.eg',
    profile_picture: { storagePath: '/uploads/bob.png', filename: 'bob.png', uploadedAt: new Date() },
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getAvailableStudents controller', () => {
  afterEach(() => jest.clearAllMocks());

  // ── 200: students available ──────────────────────────────────────────────
  it('returns 200 with student list when available students exist', async () => {
    const students = makeStudents();
    courseworkService.getAvailableStudents.mockResolvedValue(students);

    const req = mockReq('cw123', 'cls123');
    const res = mockRes();

    await getAvailableStudents(req, res);

    // Service must be called with both courseworkId AND classId from req
    expect(courseworkService.getAvailableStudents).toHaveBeenCalledWith('cw123', 'cls123');
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

    const req = mockReq('cw123', 'cls123');
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

    const req = mockReq('cw123', 'cls123');
    const res = mockRes();

    await getAvailableStudents(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'No students are enrolled in this class.',
    });
  });

  // ── 404: coursework not found — kept as defensive catch ─────────────────
  // Middleware handles this before the controller runs, but the error handler
  // is still present in the controller as a safety net.
  it('returns 404 when service throws coursework not found error', async () => {
    courseworkService.getAvailableStudents.mockRejectedValue(
      new Error('Coursework not found.')
    );

    const req = mockReq('cw123', 'cls123');
    const res = mockRes();

    await getAvailableStudents(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Coursework not found.',
    });
  });

  // ── 400: invalid coursework ID — kept as defensive catch ────────────────
  it('returns 400 when service throws invalid coursework ID format error', async () => {
    courseworkService.getAvailableStudents.mockRejectedValue(
      new Error('Invalid coursework ID format.')
    );

    const req = mockReq('not-an-id', 'cls123');
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

    const req = mockReq('cw123', 'cls123');
    const res = mockRes();

    await getAvailableStudents(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
    });
  });
});