const courseworkService = require("../services/coursework.service");
const Coursework = require("../models/CourseWork");

// POST /api/courseworks/create/:classId
const createCoursework = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { classId } = req.params;

    const files =
      req.files?.map(file => ({
        file_name: file.originalname,
        file_url: file.path,
        file_size: file.size,
        uploaded_by: instructorId,
      })) || [];

    let gradingCriteria = req.body.grading_criteria;
    if (typeof gradingCriteria === "string" && gradingCriteria.trim()) {
      gradingCriteria = JSON.parse(gradingCriteria);
    }
    gradingCriteria = Array.isArray(gradingCriteria) ? gradingCriteria : [];

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

    const courseworkWithUrls = newCoursework.toObject();
    courseworkWithUrls.files = courseworkWithUrls.files.map(file => ({
      ...file,
      view_url: `${req.protocol}://${req.get("host")}/api/courseworks/${newCoursework._id}/files/${file._id}`,
      download_url: `${req.protocol}://${req.get("host")}/api/courseworks/${newCoursework._id}/files/${file._id}?download=true`,
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

module.exports = {
  createCoursework,
};
