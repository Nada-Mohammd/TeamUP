const classService = require('../../../src/services/class.service');
const Class = require('../../../src/models/Class');
const ClassProfile = require('../../../src/models/ClassProfile');
const User = require('../../../src/models/User');
const generateClassCode = require('../../../src/utils/ClassUtils/classCodeGeneration');

jest.mock('../../../src/models/Class');
jest.mock('../../../src/models/ClassProfile');
jest.mock('../../../src/models/User');
jest.mock('../../../src/utils/ClassUtils/classCodeGeneration');

describe('Class Creation Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createClass', () => {
    it('throws error if user is not instructor', async () => {
      User.findById.mockResolvedValue({ role: 'Student' });

      await expect(classService.createClass('userId', {}))
        .rejects
        .toThrow('Only instructors can create classes.');
    });

    it('throws error if required fields are missing', async () => {
      User.findById.mockResolvedValue({ role: 'Instructor' });

      await expect(classService.createClass('userId', { course_name: 'A' }))
        .rejects
        .toThrow('Missing required fields: course_name, course_code, year.');
    });

    it('creates class and assigns instructor as admin', async () => {
      User.findById.mockResolvedValue({ role: 'Instructor' });
      generateClassCode.mockReturnValue('ABC123');
      Class.findOne.mockResolvedValue(null);
      const fakeClass = { _id: 'classId', course_name: 'DSA' };
      Class.create.mockResolvedValue(fakeClass);
      ClassProfile.create.mockResolvedValue({});

      const newClass = await classService.createClass('instructorId', {
        course_name: 'DSA',
        course_code: 'CS301',
        year: 2025,
        policy: 'some policy',
      });

      expect(newClass).toEqual(fakeClass);
      expect(ClassProfile.create).toHaveBeenCalledWith({
        classId: 'classId',
        userId: 'instructorId',
        classRole: 'admin',
      });
    });
  });
});
