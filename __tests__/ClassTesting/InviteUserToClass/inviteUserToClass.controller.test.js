const classController = require('../../../src/controllers/class.controller');
const classService = require('../../../src/services/class.service');

jest.mock('../../../src/services/class.service');

describe('InviteUserToClassController', () => {
  let req, res;

  beforeEach(() => {
    req = { params: { classId: '123' }, user: { id: 'user123' }, body: { userId: 'user456' }, io: { sockets: { sockets: new Map() }, to: jest.fn().mockReturnThis(), emit: jest.fn() } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 201 and success message', async () => {
    classService.createInvitation.mockResolvedValue({ _id: 'invite123' });

    await classController.inviteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Invitation sent successfully',
      data: { _id: 'invite123' }
    }));
  });

  it('should return 400 if service throws', async () => {
    classService.createInvitation.mockRejectedValue(new Error('fail'));

    await classController.inviteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'fail'
    }));
  });
});
