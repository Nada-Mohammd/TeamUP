const Class = require('../../../src/models/Class');
const User = require('../../../src/models/User');
const ClassProfile = require('../../../src/models/ClassProfile');
const ClassInvitation = require('../../../src/models/ClassInvitation');
const Notification = require('../../../src/models/Notification');
const classService = require('../../../src/services/class.service');

jest.mock('../../../src/models/Class');
jest.mock('../../../src/models/User');
jest.mock('../../../src/models/ClassProfile');
jest.mock('../../../src/models/ClassInvitation');
jest.mock('../../../src/models/Notification');

jest.mock('../../../src/sockets/socket', () => ({
  onlineUsers: new Map([['receiver123', 'socket123']]),
}));

describe('InviteUserToClassService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create invitation and emit notification', async () => {
    const io = { to: jest.fn().mockReturnThis(), emit: jest.fn() };

    Class.findById.mockResolvedValue({
      _id: 'class123',
      course_name: 'Math 101',
    });

    User.findById
      .mockResolvedValueOnce({ _id: 'receiver123' }) // receiver
      .mockResolvedValueOnce({
        _id: 'sender123',
        first_name: 'John',
        last_name: 'Doe',
      }); // sender

    ClassProfile.findOne.mockResolvedValue(null);
    ClassInvitation.findOne.mockResolvedValue(null);

    ClassInvitation.create.mockResolvedValue({ _id: 'invite123' });
    Notification.create.mockResolvedValue({ _id: 'notif123' });

    const result = await classService.createInvitation(
      {
        classId: 'class123',
        senderId: 'sender123',
        receiverId: 'receiver123',
      },
      io
    );

    expect(result).toEqual({ _id: 'invite123' });

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'receiver123',
        type: 'CLASS_INVITATION',
        referenceId: 'invite123',
        message: 'John Doe has invited you to join Math 101',
      })
    );

    expect(io.to).toHaveBeenCalledWith('socket123');
    expect(io.emit).toHaveBeenCalledWith(
      'newNotification',
      expect.any(Object)
    );
  });

  it('should throw if user already in class', async () => {
    Class.findById.mockResolvedValue({ _id: 'class123' });
    User.findById.mockResolvedValue({ _id: 'receiver123' });
    ClassProfile.findOne.mockResolvedValue({ userId: 'receiver123' });

    await expect(
      classService.createInvitation(
        {
          classId: 'class123',
          senderId: 'sender123',
          receiverId: 'receiver123',
        },
        {}
      )
    ).rejects.toThrow('User is already in this class');
  });
});
