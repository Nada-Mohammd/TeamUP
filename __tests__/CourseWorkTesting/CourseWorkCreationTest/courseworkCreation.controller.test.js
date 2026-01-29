const courseworkController = require('../../../src/controllers/coursework.controller');
const courseworkService = require('../../../src/services/coursework.service');

jest.mock('../../../src/services/coursework.service');

describe('Coursework Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    req = {
      user: { _id: 'instructorId' },
      params: { classId: 'classId' },
      body: {
        name: 'Assignment 1',
        deadline: '2026-01-30',
        notes: 'Some notes',
        description: 'Description here',
        grade: '90',
        team_size_min: '2',
        team_size_max: '5',
        include_discussion: true,
        grading_criteria: JSON.stringify([
          { criterion: 'Quality', points: 50 },
        ]),
      },
      files: [
        {
          _id: 'fileId',
          originalname: 'file1.pdf',
          path: 'https://cloudinary.com/file1.pdf',
          size: 1000,
        },
      ],
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost:5000'),
    };

    jest.clearAllMocks();
  });

  it('creates coursework successfully', async () => {
    // Mock the service to return a plain coursework object
    const fakeCoursework = {
      _id: 'courseworkId',
      name: 'Assignment 1',
      files: [
        {
          _id: 'fileId',
          file_name: 'file1.pdf',
          file_url: 'https://cloudinary.com/file1.pdf',
          file_size: 1000,
          uploaded_by: 'instructorId',
        },
      ],
    };

    courseworkService.createCoursework.mockResolvedValue(fakeCoursework);

    await courseworkController.createCoursework(req, res);

    // Service call assertion
    expect(courseworkService.createCoursework).toHaveBeenCalledWith(
      'instructorId',
      'classId',
      expect.objectContaining({
        name: 'Assignment 1',
        grade: 90,
        team_size_min: 2,
        team_size_max: 5,
        grading_criteria: expect.any(Array),
        files: expect.any(Array),
      })
    );

    // Controller response assertion
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Coursework created successfully',
      data: expect.objectContaining({
        _id: 'courseworkId',
        name: 'Assignment 1',
        files: expect.arrayContaining([
          expect.objectContaining({
            _id: 'fileId',
            file_name: 'file1.pdf',
            file_url: 'https://cloudinary.com/file1.pdf',
          }),
        ]),
      }),
    });
  });

  it('returns 400 if service throws an error', async () => {
    courseworkService.createCoursework.mockRejectedValue(
      new Error('Error creating coursework')
    );

    await courseworkController.createCoursework(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Error creating coursework',
    });
  });
});
