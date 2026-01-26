const courseworkService = require("../services/coursework.service");
const Coursework = require("../models/CourseWork");

// POST /api/courseworks
const createCoursework = async (req, res) => {
  try {
    const instructorId = req.user._id;

    const files = req.files?.map(file => ({
      file_name: file.originalname,
      file_url: file.path,
      file_size: file.size,
      uploaded_by: instructorId,
    })) || []; 

    let gradingCriteria = req.body.grading_criteria;
    if (typeof gradingCriteria === 'string' && gradingCriteria.trim()) {
      gradingCriteria = JSON.parse(gradingCriteria);
    }
    gradingCriteria = Array.isArray(gradingCriteria) ? gradingCriteria : []; 

    
    const notes = req.body.notes?.trim() || ""; 
    const description = req.body.description?.trim() || "";

    
    const grade = req.body.grade === '' || req.body.grade == null 
      ? null 
      : Number(req.body.grade);
    
    const teamSizeMin = req.body.team_size_min === '' || req.body.team_size_min == null
      ? null
      : Number(req.body.team_size_min);
    
    const teamSizeMax = req.body.team_size_max === '' || req.body.team_size_max == null
      ? null
      : Number(req.body.team_size_max);

    const discussionDate = req.body.discussion_date === '' 
      ? null 
      : req.body.discussion_date;
    
    const courseworkData = {
      ...req.body,
      notes,
      description,
      grading_criteria: gradingCriteria,
      grade,
      team_size_min: teamSizeMin,
      team_size_max: teamSizeMax,
      discussion_date: discussionDate,
      files,
    };

    const newCoursework = await courseworkService.createCoursework(
      instructorId,
      courseworkData
    );

    // Add frontend-friendly URLs to response
    const courseworkWithUrls = newCoursework.toObject();
    courseworkWithUrls.files = courseworkWithUrls.files.map(file => ({
      ...file,
      view_url: `${req.protocol}://${req.get('host')}/api/courseworks/${newCoursework._id}/files/${file._id}`,
      download_url: `${req.protocol}://${req.get('host')}/api/courseworks/${newCoursework._id}/files/${file._id}?download=true`,
    }));

    res.status(201).json({
      success: true,
      message: "Coursework created successfully",
      data: courseworkWithUrls,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /api/courseworks/:courseworkId/files/:fileId
const getFile = async (req, res) => {
  try {
    const { courseworkId, fileId } = req.params;
    const { download } = req.query; // ?download=true to force download

    const coursework = await Coursework.findById(courseworkId);
    if (!coursework) {
      return res.status(404).json({
        success: false,
        message: "Coursework not found",
      });
    }

    const file = coursework.files.id(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    let fileUrl = file.file_url;

    // If download is requested, modify URL to force download
    if (download === 'true') {
      fileUrl = fileUrl.replace('/upload/', '/upload/fl_attachment/');
    }

    // Redirect to Cloudinary URL
    res.redirect(fileUrl);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  createCoursework,
  getFile,
};