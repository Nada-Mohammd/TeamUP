const ClassProfile = require('../../../src/models/ClassProfile');
const classService = require('../../../src/services/class.service');

jest.mock('../../../src/models/ClassProfile');

describe('UserClassesFetchService', () => {
  it('should return classes for user', async () => {
    ClassProfile.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([
        {
          classId: {
            _id: 'class1',
            course_name: 'Math',
          },
        },
      ]),
    });

    const classes = await classService.getClasses('user123');

    expect(classes).toHaveLength(1);
    expect(classes[0].course_name).toBe('Math');
  });
});
