const courseworkService = require("../services/coursework.service");
const Coursework = require("../models/CourseWork");

// POST /api/courseworks/create/:classId
// POST /api/courseworks/create/:classId
const createCoursework = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { classId } = req.params;

    // Prepare uploaded files (Cloudinary URLs only)
    const files =
      req.files?.map(file => ({
        file_name: file.originalname,
        file_url: file.path, // direct Cloudinary URL
        file_size: file.size,
        uploaded_by: instructorId,
      })) || [];

    // Parse grading criteria if sent as string
    let gradingCriteria = req.body.grading_criteria;
    if (typeof gradingCriteria === "string" && gradingCriteria.trim()) {
      gradingCriteria = JSON.parse(gradingCriteria);
    }
    gradingCriteria = Array.isArray(gradingCriteria) ? gradingCriteria : [];

    // Prepare coursework data
    const courseworkData = {
      name: req.body.name,
      description: req.body.description?.trim() || "",
      notes: req.body.notes?.trim() || "",
      grade:
        req.body.grade === "" || req.body.grade == null
          ? null
          : Number(req.body.grade),
      team_size_min:
        req.body.team_size_min == null || req.body.team_size_min === ""
          ? null
          : Number(req.body.team_size_min),
      team_size_max:
        req.body.team_size_max == null || req.body.team_size_max === ""
          ? null
          : Number(req.body.team_size_max),
      deadline: req.body.deadline,
      discussion_date:
        req.body.discussion_date === "" ? null : req.body.discussion_date,
      include_discussion: req.body.include_discussion,
      grading_criteria: gradingCriteria,
      files,
    };

    const newCoursework = await courseworkService.createCoursework(
      instructorId,
      classId,
      courseworkData
    );

    // ✅ Return directly (no fake URLs)
    res.status(201).json({
      success: true,
      message: "Coursework created successfully",
      data: newCoursework,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /api/courseworks/:courseworkId
const getCourseworkById = async (req, res) => {
  try {
    const { courseworkId } = req.params;

    const coursework = await Coursework.findById(courseworkId);
    if (!coursework || coursework.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Coursework not found",
      });
    }

    const courseworkWithUrls = coursework.toObject();

    res.status(200).json({
      success: true,
      data: courseworkWithUrls,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


module.exports = {
  createCoursework,
  getCourseworkById,

};
