// __tests__/controllers/invitation.controller.test.js
const classController = require('../../../src/controllers/class.controller');
const classService = require('../../../src/services/class.service');

jest.mock('../../../src/services/class.service');

describe('classController.respondToInvitation', () => {
  const mockReq = {
    params: { invitationId: '60a1b2c3d4e5f67890123456' },
    body: { action: 'accept' },
    user: { id: '60a1b2c3d4e5f67890123457' },
    io: {}, // mock io
  };

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should accept invitation and return success message', async () => {
    const mockResult = {
      classId: '60a1b2c3d4e5f67890123459',
      className: 'Test Course',
    };
    classService.respondToInvitation.mockResolvedValue(mockResult);

    const req = { ...mockReq, body: { action: 'accept' } };
    await classController.respondToInvitation(req, mockRes);

    expect(classService.respondToInvitation).toHaveBeenCalledWith(
      '60a1b2c3d4e5f67890123456',
      '60a1b2c3d4e5f67890123457',
      'accept',
      {}
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: 'You have joined Test Course!',
      data: {
        classId: '60a1b2c3d4e5f67890123459',
        course_name: 'Test Course',
      },
    });
  });

  test('should decline invitation and return success message', async () => {
    classService.respondToInvitation.mockResolvedValue({ success: true });

    const req = { ...mockReq, body: { action: 'decline' } };
    await classController.respondToInvitation(req, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: 'Invitation declined.',
    });
  });

  test('should return 400 for invalid action', async () => {
    const req = { ...mockReq, body: { action: 'maybe' } };
    await classController.respondToInvitation(req, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid action. Use "accept" or "decline".',
    });
  });

  test('should return 400 on service error', async () => {
    classService.respondToInvitation.mockRejectedValue(
      new Error('Invitation not found.')
    );

    await classController.respondToInvitation(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invitation not found.',
    });
  });
});