const announcementService = require('../services/announcement.service');

const createAnnouncement = async (req, res) => {
  try {
    const { classId } = req.params;
    const instructorId = req.user._id;
    const { announcement_text } = req.body;

    const announcement = await announcementService.createAnnouncement(
      instructorId,
      classId,
      announcement_text
    );

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

const getClassAnnouncements = async (req, res) => {
  try {
    const announcements = await announcementService.getClassAnnouncements(
      req.params.classId
    );

    res.json({
      success: true,
      data: announcements,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await announcementService.updateAnnouncement(
      req.params.id,
      req.user._id,
      req.body.announcement_text
    );

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    await announcementService.deleteAnnouncement(
      req.params.id,
      req.user._id
    );

    res.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  createAnnouncement,
  getClassAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
};
