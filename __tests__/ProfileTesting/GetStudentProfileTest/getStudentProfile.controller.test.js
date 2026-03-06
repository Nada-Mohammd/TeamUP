const profileController = require('../../../src/controllers/profile.controller');
const profileService = require('../../../src/services/profile.service');

jest.mock('../../../src/services/profile.service');

describe('Profile Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    req = {
      params: { userId: 'studentId123' },
    };

    jest.clearAllMocks();
  });

  describe('getProfile', () => {

    // ─── Success ─────────────────────────────────────────────────────

    it('returns 200 with profile data on success', async () => {
      const fakeProfile = {
        _id: 'profileId',
        user_id: 'studentId123',
        username: 'johndoe',
        first_name: 'John',
        last_name: 'Doe',
        gpa: 3.8,
        skills: ['JavaScript', 'Node.js'],
        availability: ['morning'],
        links: [],
        cv: { filename: null, storagePath: null, uploadedAt: null },
        profilePicture: { filename: null, storagePath: null, uploadedAt: null },
        ratings: [],
      };

      profileService.getProfileByUserId.mockResolvedValue(fakeProfile);

      await profileController.getProfile(req, res);

      expect(profileService.getProfileByUserId).toHaveBeenCalledWith('studentId123');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          _id: 'profileId',
          username: 'johndoe',
          user_id: 'studentId123',
        }),
      });
    });

    // ─── 404 Not Found ───────────────────────────────────────────────

    it('returns 404 if profile is not found', async () => {
      profileService.getProfileByUserId.mockRejectedValue({
        status: 404,
        message: 'Profile not found.',
      });

      await profileController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Profile not found.',
      });
    });

    // ─── 500 Internal Server Error ───────────────────────────────────

    it('returns 500 if an unexpected error occurs', async () => {
      profileService.getProfileByUserId.mockRejectedValue(
        new Error('Unexpected database failure')
      );

      await profileController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unexpected database failure',
      });
    });
  });
});