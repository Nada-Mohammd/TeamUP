const ClassProfile = require('../../../src/models/ClassProfile');
const Class = require('../../../src/models/Class');
const classService = require('../../../src/services/class.service');

jest.mock('../../../src/models/ClassProfile');
jest.mock('../../../src/models/Class');

describe('UserClassesFetchService', () => {
  it('should return classes for user', async () => {
    ClassProfile.find.mockResolvedValue([{ classId: { _id: 'class1', course_name: 'Math' } }]);

    const classes = await classService.getClasses('user123');
    expect(classes.length).toBe(1);
    expect(classes[0].course_name).toBe('Math');
  });
});
