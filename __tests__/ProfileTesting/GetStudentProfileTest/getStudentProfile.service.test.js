const profileService = require('../../../src/services/profile.service');
const StudentProfile = require('../../../src/models/StudentProfile');

jest.mock('../../../src/models/StudentProfile');

describe('Profile Service', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfileByUserId', () => {

    // ─── Success ─────────────────────────────────────────────────────

    it('returns a profile when found', async () => {
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

      StudentProfile.findOne.mockResolvedValue(fakeProfile);

      const result = await profileService.getProfileByUserId('studentId123');

      expect(StudentProfile.findOne).toHaveBeenCalledWith({ user_id: 'studentId123' });
      expect(result).toEqual(fakeProfile);
    });

    // ─── 404 Not Found ───────────────────────────────────────────────

    it('throws 404 if profile does not exist', async () => {
      StudentProfile.findOne.mockResolvedValue(null);

      await expect(profileService.getProfileByUserId('nonExistentId'))
        .rejects.toMatchObject({
          status: 404,
          message: 'Profile not found.',
        });

      expect(StudentProfile.findOne).toHaveBeenCalledWith({ user_id: 'nonExistentId' });
    });

    // ─── 500 Internal Server Error ───────────────────────────────────

    it('throws if the database call fails unexpectedly', async () => {
      StudentProfile.findOne.mockRejectedValue(new Error('DB connection error'));

      await expect(profileService.getProfileByUserId('studentId123'))
        .rejects.toThrow('DB connection error');
    });
  });
});