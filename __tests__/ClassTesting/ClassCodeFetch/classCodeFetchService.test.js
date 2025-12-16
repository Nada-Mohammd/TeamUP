const classService = require('../../../src/services/class.service');
const Class = require('../../../src/models/Class');
const ClassProfile = require('../../../src/models/ClassProfile');

jest.mock('../../../src/models/Class');
jest.mock('../../../src/models/ClassProfile');

describe('Class Code Fetch Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getClassCode', () => {
        it('throws error if user not a member', async () => {
            ClassProfile.findOne.mockResolvedValue(null);

            await expect(classService.getClassCode('classId', 'userId'))
                .rejects
                .toThrow('Not a class member');
        });

        it('throws error if user is not admin', async () => {
            ClassProfile.findOne.mockResolvedValue({ classRole: 'member' });

            await expect(classService.getClassCode('classId', 'userId'))
                .rejects
                .toThrow('Admins only can view class code');
        });

        it('throws error if class not found', async () => {
            ClassProfile.findOne.mockResolvedValue({ classRole: 'admin' });
            Class.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            await expect(classService.getClassCode('classId', 'userId'))
                .rejects
                .toThrow('Class not found');
        });

        it('returns class code if admin', async () => {
            ClassProfile.findOne.mockResolvedValue({ classRole: 'admin' });
            Class.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({ class_code: 'ABC123' })
            });

            const code = await classService.getClassCode('classId', 'userId');
            expect(code).toBe('ABC123');
        });
    });
});
