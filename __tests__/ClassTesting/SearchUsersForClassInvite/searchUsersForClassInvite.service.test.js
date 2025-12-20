const User = require('../../../src/models/User');
const ClassProfile = require('../../../src/models/ClassProfile');
const Class = require('../../../src/models/Class');
const classService = require('../../../src/services/class.service');

jest.mock('../../../src/models/User');
jest.mock('../../../src/models/ClassProfile');
jest.mock('../../../src/models/Class');

describe('SearchUsersForClassInviteService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return users with isAlreadyInClass flag', async () => {
    // Class exists
    Class.findById.mockResolvedValue({ _id: 'class1' });

    // Class members
    ClassProfile.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { userId: '1' },
      ]),
    });

    User.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        {
          _id: '1',
          username: 'a',
          first_name: 'A',
          last_name: 'B',
          role: 'Student',
        },
      ]),
    });

    const result = await classService.searchUsers('class1', 'a');

    expect(result).toEqual([
      {
        _id: '1',
        username: 'a',
        first_name: 'A',
        last_name: 'B',
        role: 'Student',
        isAlreadyInClass: true,
      },
    ]);
  });
});
