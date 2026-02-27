const courseworkService = require('../../../src/services/coursework.service');
const Coursework = require('../../../src/models/CourseWork');
const User = require('../../../src/models/User');
const ClassProfile = require('../../../src/models/ClassProfile');
const notificationService = require('../../../src/services/notification.service');
const Post = require('../../../src/models/Post');
const Class = require('../../../src/models/Class'); // ✅ ADDED

jest.mock('../../../src/models/CourseWork');
jest.mock('../../../src/models/User');
jest.mock('../../../src/models/ClassProfile');
jest.mock('../../../src/services/notification.service');
jest.mock('../../../src/models/Post');
jest.mock('../../../src/models/Class'); // ✅ ADDED

describe('Coursework Service', () => {
  afterEach(() => jest.clearAllMocks());

  describe('createCoursework', () => {
    const instructorId = 'instructorId';
    const classId = '69786145f373bb543a5da1b5';
    const courseworkData = {
      name: 'Assignment 1',
      deadline: '2026-01-30',
      notes: 'Some notes',
      description: 'Description here',
      grade: 90,
      team_size_min: 2,
      team_size_max: 5,
      include_discussion: true,
      grading_criteria: [{ criterion: 'Quality', points: 50 }],
      files: [
        { file_name: 'file1.pdf', file_url: '/uploads/file1.pdf', file_size: 1000 },
      ],
    };

    it('throws error if user is not instructor', async () => {
      User.findById.mockResolvedValue({ role: 'Student' });

      await expect(courseworkService.createCoursework(instructorId, classId, courseworkData))
        .rejects.toThrow('Only instructors can create coursework.');
    });

    it('throws error if user not found', async () => {
      User.findById.mockResolvedValue(null);

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

    it('throws error if team_size_min > team_size_max', async () => {
      User.findById.mockResolvedValue({ role: 'Instructor' });
      Class.findById.mockResolvedValue({}); // Required for notification

      await expect(courseworkService.createCoursework(instructorId, classId, {
        name: 'Test',
        deadline: '2026-01-30',
        team_size_min: 10,
        team_size_max: 5,
      })).rejects.toThrow('team_size_min cannot be greater than team_size_max.');
    });

    it('creates coursework, post, and notifications', async () => {
      // ✅ Mock User with exact role
      User.findById.mockResolvedValue({ 
        _id: instructorId, 
        role: 'Instructor' 
      });
      
      // ✅ Mock Class.findById (used for notifications)
      Class.findById.mockResolvedValue({
        _id: classId,
        course_code: 'CS101',
        class_color: '#3498db'
      });
      
      // ✅ Mock ClassProfile.find for members
      ClassProfile.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          { userId: { _id: 'student1', role: 'Student' }, classRole: 'member' },
          { userId: { _id: 'student2', role: 'Student' }, classRole: 'member' },
          { userId: { _id: 'ta1', role: 'TA' }, classRole: 'member' },
        ]),
      });

      Coursework.create.mockResolvedValue({ 
        _id: 'courseworkId', 
        toObject: () => ({ _id: 'courseworkId', files: courseworkData.files }) 
      });
      Post.create.mockResolvedValue({});
      notificationService.createBulkNotifications.mockResolvedValue([]);
      notificationService.createNotification.mockResolvedValue({});

      const result = await courseworkService.createCoursework(instructorId, classId, courseworkData);

      expect(result._id).toBe('courseworkId');
      
      // Verify post creation
      expect(Post.create).toHaveBeenCalledWith(expect.objectContaining({
        type: 'COURSEWORK',
        classId,
        authorId: instructorId,
        courseworkId: 'courseworkId',
      }));

      // Verify student notifications (only students, not TA)
      expect(notificationService.createBulkNotifications).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            userId: 'student1', 
            type: 'COURSEWORK',
            message: expect.stringContaining('New coursework "Assignment 1" has been added')
          }),
          expect.objectContaining({ 
            userId: 'student2', 
            type: 'COURSEWORK' 
          }),
        ])
      );
      expect(notificationService.createBulkNotifications).not.toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ userId: 'ta1' })
        ])
      );

      // Verify instructor notification
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: instructorId,
          type: 'COURSEWORK',
          message: expect.stringContaining('Your coursework "Assignment 1" was created successfully'),
        })
      );
    });
  });
});