const sectionService = require('../../../src/services/section.service');
const Section = require('../../../src/models/Section');
const SectionMember = require('../../../src/models/SectionMember');
const User = require('../../../src/models/User');
const ClassProfile = require('../../../src/models/ClassProfile'); 


jest.mock('../../../src/models/Section');
jest.mock('../../../src/models/SectionMember');
jest.mock('../../../src/models/User');
jest.mock('../../../src/models/ClassProfile'); 

describe('Section Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- getSectionsByClass ---
  describe('getSectionsByClass', () => {
    it('should return sections sorted by created_at', async () => {
      const sections = [{ _id: '1', section_name: 'Sec A' }];
      Section.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(sections),
      });

      const result = await sectionService.getSectionsByClass('class123');

      expect(Section.find).toHaveBeenCalledWith({ classId: 'class123' });
      expect(result).toEqual(sections);
    });
  });

  // --- createSection ---
  describe('createSection', () => {
    it('should throw if no instructors provided', async () => {
      await expect(
        sectionService.createSection({ classId: 'c1', section_name: 'S1', instructorIds: [] })
      ).rejects.toEqual({
        status: 400,
        message: 'At least one instructor must be assigned.',
      });
    });

    it('should create section and assign instructors', async () => {
      User.find.mockResolvedValue([{ _id: 'inst1', role: 'Instructor' }]);
      Section.create.mockResolvedValue({ _id: 'sec1', section_name: 'S1' });
      SectionMember.insertMany.mockResolvedValue();

      const result = await sectionService.createSection({
        classId: 'c1',
        section_name: 'S1',
        instructorIds: ['inst1'],
      });

      expect(Section.create).toHaveBeenCalledWith({ classId: 'c1', section_name: 'S1' });
      expect(SectionMember.insertMany).toHaveBeenCalledWith([
        { sectionId: 'sec1', userId: 'inst1' }
      ]);
      expect(result._id).toBe('sec1');
    });
  });

  // --- updateSection ---
  describe('updateSection', () => {
    it('should throw 404 if section not found', async () => {
      Section.findOneAndUpdate.mockResolvedValue(null);
      const validSectionId = '69409c5e6f329406f76a6abe'; 

      await expect(
        sectionService.updateSection({ classId: 'c1', sectionId: validSectionId, section_name: 'New' })
      ).rejects.toEqual({
        status: 404,
        message: `Section with ID '${validSectionId}' not found in this class.`,
      });
    });

    it('should handle invalid ID format', async () => {
      await expect(
        sectionService.updateSection({ classId: 'c1', sectionId: 'invalid', section_name: 'New' })
      ).rejects.toEqual({
        status: 400,
        message: "Invalid section ID format. Expected 24-character hexadecimal string, got: 'invalid'",
      });
    });
  });

  // --- joinSection ---
  describe('joinSection', () => {
    const mockUserId = '69409c5e6f329406f76a6005';
    const mockClassId = '69409c5e6f329406f76a6001';
    const mockSectionId = '69409c5e6f329406f76a6abe';

    it('should throw if user is not a student', async () => {
      User.findById.mockResolvedValue({ _id: mockUserId, role: 'Instructor' });

      await expect(
        sectionService.joinSection({ classId: mockClassId, sectionId: mockSectionId, userId: mockUserId })
      ).rejects.toEqual({
        status: 403,
        message: 'Only students can join sections.'
      });
    });

    it('should throw if student is not enrolled in the class', async () => {
      User.findById.mockResolvedValue({ _id: mockUserId, role: 'Student' });
      ClassProfile.findOne.mockResolvedValue(null); // NOT enrolled

      await expect(
        sectionService.joinSection({ classId: mockClassId, sectionId: mockSectionId, userId: mockUserId })
      ).rejects.toEqual({
        status: 403,
        message: 'You are not enrolled in this class.'
      });

      // Ensure didn't check section or duplicate
      expect(Section.findOne).not.toHaveBeenCalled();
      expect(SectionMember.findOne).not.toHaveBeenCalled();
    });

    it('should throw if section does not belong to class', async () => {
      User.findById.mockResolvedValue({ _id: mockUserId, role: 'Student' });
      ClassProfile.findOne.mockResolvedValue({ classId: mockClassId, userId: mockUserId }); // enrolled
      Section.findOne.mockResolvedValue(null); // section not in class

      await expect(
        sectionService.joinSection({ classId: mockClassId, sectionId: mockSectionId, userId: mockUserId })
      ).rejects.toEqual({
        status: 404,
        message: 'Section does not belong to this class.'
      });
    });

    it('should prevent duplicate join', async () => {
      User.findById.mockResolvedValue({ _id: mockUserId, role: 'Student' });
      ClassProfile.findOne.mockResolvedValue({ classId: mockClassId, userId: mockUserId });
      Section.findOne.mockResolvedValue({ _id: mockSectionId });
      SectionMember.findOne.mockResolvedValue({ sectionId: mockSectionId, userId: mockUserId });

      await expect(
        sectionService.joinSection({ classId: mockClassId, sectionId: mockSectionId, userId: mockUserId })
      ).rejects.toEqual({
        status: 409,
        message: 'You have already joined this section.'
      });
    });

    it('should join a section successfully', async () => {
      User.findById.mockResolvedValue({ _id: mockUserId, role: 'Student' });
      ClassProfile.findOne.mockResolvedValue({ classId: mockClassId, userId: mockUserId });
      Section.findOne.mockResolvedValue({ _id: mockSectionId });
      SectionMember.findOne.mockResolvedValue(null);
      SectionMember.create.mockResolvedValue({
        sectionId: mockSectionId,
        userId: mockUserId,
        joined_at: new Date()
      });

      const result = await sectionService.joinSection({
        classId: mockClassId,
        sectionId: mockSectionId,
        userId: mockUserId
      });

      expect(result).toBeDefined();
      expect(SectionMember.create).toHaveBeenCalledWith({
        sectionId: mockSectionId,
        userId: mockUserId
      });
    });
  });

  // --- getSectionMembers ---
  describe('getSectionMembers', () => {
    it('should return user details for members', async () => {
      Section.findOne.mockResolvedValue({ _id: 'sec1' });
      
      // Mock chainable query: .find().select()
      SectionMember.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([{ userId: 'u1' }])
      });

      User.find.mockResolvedValue([
        { _id: 'u1', first_name: 'Nada', last_name: 'Ali', email: 'nada@stud.fci-cu.edu.eg', role: 'Student' }
      ]);

      const result = await sectionService.getSectionMembers({ classId: 'c1', sectionId: 'sec1' });

      expect(User.find).toHaveBeenCalledWith(
        { _id: { $in: ['u1'] } },
        'first_name last_name email role'
      );
      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe('Nada');
    });
  });

  // --- assignInstructorsToSection ---
  describe('assignInstructorsToSection', () => {
    it('should assign new instructors only', async () => {
      Section.findOne.mockResolvedValue({ _id: 'sec1' });
      
      //Return both instructors
      User.find.mockResolvedValue([
        { _id: 'inst1', role: 'Instructor' },
        { _id: 'inst2', role: 'Instructor' }
      ]);

      // inst1 already in section
      SectionMember.find.mockResolvedValue([{ userId: 'inst1' }]);

      SectionMember.insertMany.mockResolvedValue();

      const result = await sectionService.assignInstructorsToSection({
        classId: 'c1',
        sectionId: 'sec1',
        instructorIds: ['inst1', 'inst2'],
      });

      expect(result.assigned).toEqual(['inst2']);
      expect(SectionMember.insertMany).toHaveBeenCalledWith([
        { sectionId: 'sec1', userId: 'inst2' }
      ]);
    });

    it('should throw if non-instructor ID is provided', async () => {
      Section.findOne.mockResolvedValue({ _id: 'sec1' });
      User.find.mockResolvedValue([{ _id: 'inst1', role: 'Instructor' }]);

      await expect(
        sectionService.assignInstructorsToSection({
          classId: 'c1',
          sectionId: 'sec1',
          instructorIds: ['inst1', 'student1'],
        })
      ).rejects.toEqual({
        status: 400,
        message: 'One or more provided IDs are not valid instructors.',
      });
    });
  });
});