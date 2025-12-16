const classController = require('../../../src/controllers/class.controller');
const classService = require('../../../src/services/class.service');

jest.mock('../../../src/services/class.service');

describe('Class Creation Controller', () => {
  let res;
  let req;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    req = {
      user: { id: 'userId' },
      body: { course_name: 'DSA', course_code: 'CS301', year: 2025, policy: 'policy' },
    };
    jest.clearAllMocks();
  });

  it('responds with created class', async () => {
    const fakeClass = { _id: 'classId', course_name: 'DSA' };
    classService.createClass.mockResolvedValue(fakeClass);

    await classController.createClass(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Class created successfully',
      data: fakeClass,
    });
  });

  it('handles service errors', async () => {
    classService.createClass.mockRejectedValue(new Error('Error'));

    await classController.createClass(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Error',
    });
  });
});
