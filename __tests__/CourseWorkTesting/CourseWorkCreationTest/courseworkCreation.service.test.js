const courseworkService = require('../../../src/services/coursework.service');
const Coursework = require('../../../src/models/CourseWork');
const User = require('../../../src/models/User');
const ClassProfile = require('../../../src/models/ClassProfile');
const notificationService = require('../../../src/services/notification.service');
const Post = require('../../../src/models/Post');

jest.mock('../../../src/models/CourseWork');
jest.mock('../../../src/models/User');
jest.mock('../../../src/models/ClassProfile');
jest.mock('../../../src/services/notification.service');
jest.mock('../../../src/models/Post');

describe('Coursework Service', () => {
  afterEach(() => jest.clearAllMocks());

  describe('createCoursework', () => {
    const instructorId = 'instructorId';
    const classId = 'classId';
    const courseworkData = {
      name: 'Assignment 1',
      deadline: '2026-01-30',
      notes: 'Some notes',
      description: 'Description here',
      grade: 90,
      team_size_min: 2,
      team_size_max: 5,
      include_discussion: true,
      grading_criteria: [{ criterion: 'Quality', weight: 50 }],
      files: [
        { file_name: 'file1.pdf', file_url: '/uploads/file1.pdf', file_size: 1000 },
      ],
    };

    it('throws error if user is not instructor', async () => {
      User.findById.mockResolvedValue({ role: 'Student' });

      await expect(courseworkService.createCoursework(instructorId, classId, courseworkData))
        .rejects.toThrow('Only instructors can create coursework.');
    });

    it('throws error if classId is missing', async () => {
      User.findById.mockResolvedValue({ role: 'Instructor' });

      await expect(courseworkService.createCoursework(instructorId, null, courseworkData))
        .rejects.toThrow('Class ID is required.');
    });

    it('throws error if required fields are missing', async () => {
      User.findById.mockResolvedValue({ role: 'Instructor' });

      await expect(courseworkService.createCoursework(instructorId, classId, { name: '' }))
        .rejects.toThrow('Missing required fields: name and deadline.');
    });

    it('creates coursework, post, and notifications', async () => {
      User.findById.mockResolvedValue({ role: 'Instructor' });
      Coursework.create.mockResolvedValue({ _id: 'courseworkId', toObject: () => ({ _id: 'courseworkId', files: courseworkData.files }) });
      Post.create.mockResolvedValue({});
      ClassProfile.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          { userId: { _id: 'student1', role: 'Student' }, classRole: 'member' },
          { userId: { _id: 'student2', role: 'Student' }, classRole: 'member' },
          { userId: { _id: 'ta1', role: 'TA' }, classRole: 'member' }, // not a student
        ]),
      });
      notificationService.createBulkNotifications.mockResolvedValue([]);
      notificationService.createNotification.mockResolvedValue({});

      const result = await courseworkService.createCoursework(instructorId, classId, courseworkData);

      expect(result._id).toBe('courseworkId');
      expect(Post.create).toHaveBeenCalledWith(expect.objectContaining({
        type: 'COURSEWORK',
        classId,
        authorId: instructorId,
        courseworkId: 'courseworkId',
      }));

      expect(notificationService.createBulkNotifications).toHaveBeenCalledWith([
        expect.objectContaining({ userId: 'student1', type: 'COURSEWORK' }),
        expect.objectContaining({ userId: 'student2', type: 'COURSEWORK' }),
      ]);

      expect(notificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({
        userId: instructorId,
        type: 'COURSEWORK',
        message: expect.stringContaining('was created successfully'),
      }));
    });
  });
});
