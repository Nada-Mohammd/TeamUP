const sectionController = require('../../../src/controllers/section.controller');
const sectionService = require('../../../src/services/section.service');

jest.mock('../../../src/services/section.service');

describe('Section Controller', () => {
  let req, res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // --- GET /sections ---
  describe('getSections', () => {
    it('should return sections successfully', async () => {
      const sections = [{ _id: '1', section_name: 'Sec A' }];
      sectionService.getSectionsByClass.mockResolvedValue(sections);
      req = { params: { id: 'class123' } };

      await sectionController.getSections(req, res);

      expect(sectionService.getSectionsByClass).toHaveBeenCalledWith('class123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        data: sections,
      });
    });

    it('should handle service errors', async () => {
      const error = { status: 404, message: 'Class not found' };
      sectionService.getSectionsByClass.mockRejectedValue(error);
      req = { params: { id: 'class123' } };

      await sectionController.getSections(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Class not found',
      });
    });
  });

  // --- POST /sections ---
  describe('createSection', () => {
    it('should create a section successfully', async () => {
      const section = { _id: 'sec1', section_name: 'New Sec' };
      sectionService.createSection.mockResolvedValue(section);
      req = {
        params: { id: 'class123' },
        body: { section_name: 'New Sec', instructorIds: ['inst1'] },
      };

      await sectionController.createSection(req, res);

      expect(sectionService.createSection).toHaveBeenCalledWith({
        classId: 'class123',
        section_name: 'New Sec',
        instructorIds: ['inst1'],
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: section,
      });
    });
  });

  // --- PUT /sections/:sectionId ---
  describe('updateSection', () => {
    it('should update a section successfully', async () => {
      const section = { _id: 'sec1', section_name: 'Updated' };
      sectionService.updateSection.mockResolvedValue(section);
      req = {
        params: { id: 'class123', sectionId: 'sec1' },
        body: { section_name: 'Updated' },
      };

      await sectionController.updateSection(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: section,
      });
    });

    it('should handle 404 error from service', async () => {
      const error = { status: 404, message: "Section not found" };
      sectionService.updateSection.mockRejectedValue(error);
      req = {
        params: { id: 'class123', sectionId: 'invalid' },
        body: { section_name: 'Updated' },
      };

      await sectionController.updateSection(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: "Section not found",
      });
    });
  });

  // --- DELETE /sections/:sectionId ---
  describe('deleteSection', () => {
    it('should delete a section successfully', async () => {
      sectionService.deleteSection.mockResolvedValue();
      req = { params: { id: 'class123', sectionId: 'sec1' } };

      await sectionController.deleteSection(req, res);

      expect(sectionService.deleteSection).toHaveBeenCalledWith({
        classId: 'class123',
        sectionId: 'sec1',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Section deleted successfully.',
      });
    });
  });

  // --- POST /join ---
  describe('joinSection', () => {
    it('should join a section successfully', async () => {
      const result = { sectionId: 'sec1', userId: 'stud1' };
      sectionService.joinSection.mockResolvedValue(result);
      req = {
        params: { id: 'class123', sectionId: 'sec1' },
        user: { _id: 'stud1' },
      };

      await sectionController.joinSection(req, res);

      expect(sectionService.joinSection).toHaveBeenCalledWith({
        classId: 'class123',
        sectionId: 'sec1',
        userId: 'stud1',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: result,
      });
    });
  });

  // --- GET /members ---
  describe('getSectionMembers', () => {
    it('should fetch members successfully', async () => {
      const members = [{ _id: 'u1', first_name: 'Nada' }];
      sectionService.getSectionMembers.mockResolvedValue(members);
      req = { params: { id: 'class123', sectionId: 'sec1' } };

      await sectionController.getSectionMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        data: members,
      });
    });
  });

  // --- POST /instructors ---
  describe('assignInstructors', () => {
    it('should assign instructors successfully', async () => {
      const result = { assigned: ['inst2'], message: '1 instructor(s) assigned successfully.' };
      sectionService.assignInstructorsToSection.mockResolvedValue(result);
      req = {
        params: { id: 'class123', sectionId: 'sec1' },
        body: { instructorIds: ['inst2'] },
      };

      await sectionController.assignInstructors(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: result,
      });
    });
  });
});