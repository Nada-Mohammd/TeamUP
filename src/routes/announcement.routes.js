const express = require('express');
const router = express.Router();

const announcementController = require('../controllers/announcement.controller');
const {
  authenticate,
  authorize,
  authorizeClassRole,
} = require('../middlewares/auth');

router.post(
  '/create/:classId',
  authenticate,
  authorize('Instructor'),
  authorizeClassRole('admin'),
  announcementController.createAnnouncement
);

router.get(
  '/class/:classId',
  authenticate,
  announcementController.getClassAnnouncements
);

router.put(
  '/:id',
  authenticate,
  authorize('Instructor'),
  announcementController.updateAnnouncement
);

router.delete(
  '/:id',
  authenticate,
  authorize('Instructor'),
  announcementController.deleteAnnouncement
);

module.exports = router;
