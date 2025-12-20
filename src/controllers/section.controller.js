const SectionService = require('../services/section.service');

/**
 * GET /api/classes/:id/sections
 */
exports.getSections = async (req, res) => {
  try {
    const { id: classId } = req.params;

    const sections = await SectionService.getSectionsByClass(classId);

    return res.status(200).json({
      status: 'success',
      results: sections.length,
      data: sections,
    });

  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({
      status: err.status >= 500 ? 'error' : 'fail',
      message: err.message || 'Failed to fetch sections.',
    });
  }
};

/**
 * POST /api/classes/:id/sections
 */
exports.createSection = async (req, res) => {
  try {
    const { id: classId } = req.params;
    const { section_name, instructorIds } = req.body;

    const section = await SectionService.createSection({
      classId,
      section_name,
      instructorIds,
    });

    return res.status(201).json({
      status: 'success',
      data: section,
    });

  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({
      status: err.status >= 500 ? 'error' : 'fail',
      message: err.message || 'Failed to create section.',
    });
  }
};

/**
 * PUT /api/classes/:id/sections/:sectionId
 */
exports.updateSection = async (req, res) => {
  try {
    const { id: classId, sectionId } = req.params;
    const { section_name } = req.body;
      
    const section = await SectionService.updateSection({
      classId,
      sectionId,
      section_name,
    });

    return res.status(200).json({
      status: 'success',
      data: section,
    });

  } catch (err) {
    console.error('Update section error:', err);
    return res.status(err.status || 500).json({
      status: err.status >= 500 ? 'error' : 'fail',
      message: err.message || 'Failed to update section.',
    });
  }
};

/**
 * DELETE /api/classes/:id/sections/:sectionId
 */
exports.deleteSection = async (req, res) => {
  try {
    const { id: classId, sectionId } = req.params;

    await SectionService.deleteSection({ classId, sectionId });

    return res.status(200).json({
      status: 'success',
      message: 'Section deleted successfully.',
    });

  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({
      status: err.status >= 500 ? 'error' : 'fail',
      message: err.message || 'Failed to delete section.',
    });
  }
};

/**
 * POST /api/classes/:id/sections/:sectionId/join
 */
exports.joinSection = async (req, res) => {
  try {
    const { id: classId, sectionId } = req.params;
    const userId = req.user._id;

    const result = await SectionService.joinSection({
      classId,
      sectionId,
      userId,
    });

    return res.status(200).json({
      status: 'success',
      data: result,
    });

  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({
      status: err.status >= 500 ? 'error' : 'fail',
      message: err.message || 'Failed to join section.',
    });
  }
};
/**
 * GET /api/classes/:id/sections/:sectionId/members
 */
exports.getSectionMembers = async (req, res) => {
  try {
    const { id: classId, sectionId } = req.params;

    const members = await SectionService.getSectionMembers({
      classId,
      sectionId,
    });

    return res.status(200).json({
      status: 'success',
      results: members.length,
      data: members,
    });

  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({
      status: err.status >= 500 ? 'error' : 'fail',
      message: err.message || 'Failed to fetch section members.',
    });
  }
};
/**
 * POST /api/classes/:id/sections/:sectionId/instructors
 * Assign additional instructors to a section
 */
exports.assignInstructors = async (req, res) => {
  try {
    const { id: classId, sectionId } = req.params;
    const { instructorIds } = req.body;

    const result = await SectionService.assignInstructorsToSection({
      classId,
      sectionId,
      instructorIds
    });

    return res.status(200).json({
      status: 'success',
      data: result
    });

  } catch (err) {
    console.error('Assign instructors error:', err);
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: statusCode >= 500 ? 'error' : 'fail',
      message: err.message || 'Failed to assign instructors.',
    });
  }
};