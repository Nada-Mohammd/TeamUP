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
      body: {
        name: 'Assignment 1',
        classId: 'classId',
        deadline: '2026-01-30',
        notes: 'Some notes',
        description: 'Description here',
      },
      files: [
        { originalname: 'file1.pdf', path: '/uploads/file1.pdf', size: 1000 },
      ],
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost:3000'),
    };
    jest.clearAllMocks();
  });

  it('responds with created coursework', async () => {
    const fakeCoursework = {
      _id: 'courseworkId',
      toObject: () => ({
        _id: 'courseworkId',
        name: 'Assignment 1',
        files: [{ _id: 'fileId', file_name: 'file1.pdf', file_url: '/uploads/file1.pdf' }],
      }),
    };
    courseworkService.createCoursework.mockResolvedValue(fakeCoursework);

    await courseworkController.createCoursework(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Coursework created successfully',
      data: expect.objectContaining({
        _id: 'courseworkId',
        files: expect.arrayContaining([
          expect.objectContaining({
            view_url: expect.stringContaining('/api/courseworks/courseworkId/files/fileId'),
            download_url: expect.stringContaining('?download=true'),
          }),
        ]),
      }),
    });
  });

  it('handles service errors', async () => {
    courseworkService.createCoursework.mockRejectedValue(new Error('Error creating coursework'));

    await courseworkController.createCoursework(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Error creating coursework',
    });
  });
});
