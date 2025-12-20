const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  getSections,
  createSection,
  updateSection,
  deleteSection,
  joinSection,
  getSectionMembers,
  assignInstructors
} = require('../controllers/section.controller');

const { authenticate, authorize } = require('../middlewares/auth');

// Get sections (Instructor / Student)
router.get(
  '/:id/sections',
  authenticate,
  getSections
);

// Create section (Instructor)
router.post(
  '/:id/sections',
  authenticate,
  authorize('Instructor'),
  createSection
);

// Update section (Instructor)
router.put(
  '/:id/sections/:sectionId',
  authenticate,
  authorize('Instructor'),
  updateSection
);

// Delete section (Instructor)
router.delete(
  '/:id/sections/:sectionId',
  authenticate,
  authorize('Instructor'),
  deleteSection
);

// Student joins section
router.post(
  '/:id/sections/:sectionId/join',
  authenticate,
  authorize('Student'),
  joinSection
);

// Get section members (Instructor or enrolled Student)
router.get(
  '/:id/sections/:sectionId/members',
  authenticate,
  getSectionMembers
);

// Assign instructors to section (Instructor)
router.post(
  '/:id/sections/:sectionId/instructors',
  authenticate,
  authorize('Instructor'),
  assignInstructors
);
module.exports = router;
