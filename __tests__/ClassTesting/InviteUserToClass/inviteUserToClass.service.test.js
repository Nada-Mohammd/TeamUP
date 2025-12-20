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

describe('InviteUserToClassService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an invitation and notification', async () => {
    const classId = 'class123';
    const senderId = 'sender123';
    const receiverId = 'receiver123';
    const io = { sockets: { sockets: new Map(), to: jest.fn().mockReturnThis(), emit: jest.fn() } };

    Class.findById.mockResolvedValue({ _id: classId, course_name: 'Math 101' });
    User.findById.mockResolvedValue({ _id: receiverId, username: 'student1' });
    ClassProfile.findOne.mockResolvedValue(null);
    ClassInvitation.findOne.mockResolvedValue(null);
    ClassInvitation.create.mockResolvedValue({ _id: 'invite123' });
    Notification.create.mockResolvedValue({ _id: 'notif123' });

    const result = await classService.createInvitation({ classId, senderId, receiverId }, io);

    expect(result).toEqual({ _id: 'invite123' });
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: receiverId,
      type: 'CLASS_INVITATION',
      referenceId: 'invite123',
      message: expect.stringContaining('student1 has invited you to join Math 101')
    }));
    expect(io.to).toHaveBeenCalled();
  });

  it('should throw error if user is already a member', async () => {
    Class.findById.mockResolvedValue({ _id: classId });
    User.findById.mockResolvedValue({ _id: receiverId });
    ClassProfile.findOne.mockResolvedValue({ userId: receiverId });

    await expect(classService.createInvitation({ classId, senderId, receiverId }, io))
      .rejects.toThrow('User is already in this class');
  });
});
