const classController = require('../../../src/controllers/class.controller');
const classService = require('../../../src/services/class.service.js');

jest.mock('../../../src/services/class.service.js');

describe('Class Code Fetch Controller', () => {
  let res;
  let req;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    req = {
      user: { id: 'userId' },
      params: { classId: 'classId' },
    };
    jest.clearAllMocks();
  });

  it('responds with class code', async () => {
    classService.getClassCode.mockResolvedValue('ABC123');

    await classController.getClassCode(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ class_code: 'ABC123' });
  });

  it('handles errors', async () => {
    classService.getClassCode.mockRejectedValue(new Error('Forbidden'));

    await classController.getClassCode(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
  });
});
