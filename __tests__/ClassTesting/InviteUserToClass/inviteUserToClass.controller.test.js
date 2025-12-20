const classController = require('../../../src/controllers/class.controller');
const classService = require('../../../src/services/class.service');

jest.mock('../../../src/services/class.service');

describe('InviteUserToClassController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { classId: 'class123' },
      user: { id: 'sender123' },
      body: { userId: 'receiver123' },
      io: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 201 on successful invite', async () => {
    classService.createInvitation.mockResolvedValue({ _id: 'invite123' });

    await classController.inviteUser(req, res);

    expect(classService.createInvitation).toHaveBeenCalledWith(
      {
        classId: 'class123',
        senderId: 'sender123',
        receiverId: 'receiver123',
      },
      req.io
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Invitation sent successfully',
      data: { _id: 'invite123' },
    });
  });

  it('should return 400 if service throws error', async () => {
    classService.createInvitation.mockRejectedValue(new Error('fail'));

    await classController.inviteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'fail',
    });
  });
});
