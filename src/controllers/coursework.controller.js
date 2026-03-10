const courseworkService = require("../services/coursework.service");
const Coursework = require("../models/CourseWork");

// POST /api/courseworks/create/:classId
const createCoursework = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { classId } = req.params;

    // Prepare uploaded files (Cloudinary URLs only)
    const files =
      req.files?.map((file) => ({
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
      courseworkData,
    );

    const courseworkWithUrls = newCoursework.toObject();
    courseworkWithUrls.files = courseworkWithUrls.files.map((file) => ({
      ...file,
      view_url: `${req.protocol}://${req.get("host")}/api/courseworks/${newCoursework._id}/files/${file._id}`,
      download_url: `${req.protocol}://${req.get("host")}/api/courseworks/${newCoursework._id}/files/${file._id}?download=true`,
    }));

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
// PATCH /api/courseworks/update/:courseworkId
const updateCoursework = async (req, res) => {
  try {
    const { courseworkId } = req.params;
    const instructorId = req.user.id;

    // Parse grading criteria (from form-data string)
    let gradingCriteria = req.body.grading_criteria;
    if (typeof gradingCriteria === "string" && gradingCriteria.trim()) {
      gradingCriteria = JSON.parse(gradingCriteria);
    }
    gradingCriteria = Array.isArray(gradingCriteria) ? gradingCriteria : [];

    // Parse optional numeric fields
    const grade =
      req.body.grade === "" || req.body.grade == null
        ? null
        : Number(req.body.grade);
    const teamSizeMin =
      req.body.team_size_min == null || req.body.team_size_min === ""
        ? null
        : Number(req.body.team_size_min);
    const teamSizeMax =
      req.body.team_size_max == null || req.body.team_size_max === ""
        ? null
        : Number(req.body.team_size_max);

    const updateData = {
      name: req.body.name?.trim(),
      description: req.body.description?.trim() || "",
      notes: req.body.notes?.trim() || "",
      grade,
      team_size_min: teamSizeMin,
      team_size_max: teamSizeMax,
      deadline: req.body.deadline,
      discussion_date:
        req.body.discussion_date === "" ? null : req.body.discussion_date,
      include_discussion: req.body.include_discussion === "true",
      grading_criteria: gradingCriteria,
    };

    // Validate required fields
    if (!updateData.name || !updateData.deadline) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name and deadline.",
      });
    }

    // Handle new file uploads (if any)
    const newFiles =
      req.files?.map((file) => ({
        file_name: file.originalname,
        file_url: file.path, // Cloudinary URL from multer
        file_size: file.size,
        uploaded_by: instructorId,
      })) || [];

    // Call service
    const updatedCoursework = await courseworkService.updateCoursework(
      courseworkId,
      instructorId,
      updateData,
      newFiles,
    );

    // Add view/download URLs to all files (existing + new)
    const courseworkWithUrls = updatedCoursework.toObject();
    courseworkWithUrls.files = courseworkWithUrls.files.map((file) => ({
      ...file,
      view_url: `${req.protocol}://${req.get("host")}/api/courseworks/${courseworkId}/files/${file._id}`,
      download_url: `${req.protocol}://${req.get("host")}/api/courseworks/${courseworkId}/files/${file._id}?download=true`,
    }));

    res.status(200).json({
      success: true,
      message: "Coursework updated successfully",
      data: courseworkWithUrls,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// DELETE /api/courseworks/:courseworkId
const deleteCoursework = async (req, res) => {
  try {
    const { courseworkId } = req.params;
    const instructorId = req.user._id;

    await courseworkService.deleteCoursework(courseworkId, instructorId);

    res.status(200).json({
      success: true,
      message: "Coursework deleted successfully",
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /api/courseworks/:courseworkId/available-students
const getAvailableStudents = async (req, res) => {
  try {
    const { courseworkId, teamId } = req.params;
    const { classId } = req;
    const userId = req.user.id;

    const availableStudents = await courseworkService.getAvailableStudents(
      courseworkId,
      classId,
      userId,
      teamId,
    );

    return res.status(200).json({
      success: true,
      count: availableStudents.length,
      data: availableStudents,
      ...(availableStudents.length === 0 && {
        message: "All students in this class have already joined a team.",
      }),
    });
  } catch (err) {
    if (err.message === "Invalid coursework ID format.") {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err.message === "Coursework not found.") {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (err.message === "No students are enrolled in this class.") {
      return res.status(404).json({ success: false, message: err.message });
    }
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};

module.exports = {
  createCoursework,
  getCourseworkById,
  updateCoursework,
  deleteCoursework,
  getAvailableStudents,
};
