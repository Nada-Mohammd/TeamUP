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
    const courseworkData = {
      name: 'Assignment 1',
      classId: 'classId',
      deadline: '2026-01-30',
      notes: 'Some notes',
      description: 'Description here',
      files: [],
    };

    it('throws error if user is not instructor', async () => {
      User.findById.mockResolvedValue({ role: 'Student' });

      await expect(courseworkService.createCoursework(instructorId, courseworkData))
        .rejects.toThrow('Only instructors can create coursework.');
    });

    it('throws error if required fields are missing', async () => {
      User.findById.mockResolvedValue({ role: 'Instructor' });

      await expect(courseworkService.createCoursework(instructorId, { name: 'A' }))
        .rejects.toThrow('Missing required fields.');
    });

    it('creates coursework and sends notifications', async () => {
      // Mock instructor user
      User.findById.mockResolvedValue({ role: 'Instructor' });

      // Mock Coursework creation
      Coursework.create.mockResolvedValue({ 
        _id: 'courseworkId', 
        classId: 'classId', 
        authorId: instructorId, 
        name: 'Assignment 1', 
        files: [],
      });

      // Mock Post creation
      Post.create.mockResolvedValue({});

      // Mock ClassProfile.find().populate()
      ClassProfile.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          { userId: { _id: 'student1', role: 'Student' }, classRole: 'member' },
          { userId: { _id: 'student2', role: 'Student' }, classRole: 'member' },
          { userId: { _id: 'ta1', role: 'TA' }, classRole: 'member' }, // not a student
        ]),
      });

      // Mock notificationService
      notificationService.createBulkNotifications.mockResolvedValue([]);
      notificationService.createNotification.mockResolvedValue({});

      const result = await courseworkService.createCoursework(instructorId, courseworkData);

      // Check returned coursework
      expect(result._id).toBe('courseworkId');

      // Post created
      expect(Post.create).toHaveBeenCalledWith(expect.objectContaining({
        type: 'COURSEWORK',
        classId: 'classId',
        authorId: instructorId,
        courseworkId: 'courseworkId',
      }));

      // Student notifications
      expect(notificationService.createBulkNotifications).toHaveBeenCalledWith([
        expect.objectContaining({ userId: 'student1', type: 'COURSEWORK' }),
        expect.objectContaining({ userId: 'student2', type: 'COURSEWORK' }),
      ]);

      // Instructor notification
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: instructorId,
          type: 'COURSEWORK',
          message: expect.stringContaining('was created successfully'),
        })
      );
    });
  });
});
