const Coursework = require("../models/Coursework");
const { extractTextFromFile } = require("../services/fileText.service");
const {
  extractSkillsFromText,
} = require("../services/aiSkillExtraction.service");

async function extractCourseworkSkills(req, res) {
  try {
    const { courseworkId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        message: "Please upload a PDF or DOCX file.",
      });
    }

    const coursework = await Coursework.findById(courseworkId);

    if (!coursework) {
      return res.status(404).json({
        message: "Coursework not found.",
      });
    }

    const text = await extractTextFromFile(req.file);

    if (!text || text.trim().length < 50) {
      return res.status(400).json({
        message: "Could not extract enough text from the file.",
      });
    }

    const aiResult = await extractSkillsFromText(text);

    coursework.ai_required_skills = aiResult.required_skills || [];
    coursework.ai_preferred_skills = aiResult.preferred_skills || [];
    coursework.ai_recommended_roles = aiResult.recommended_roles || [];
    coursework.ai_difficulty = aiResult.difficulty || "unknown";
    coursework.ai_analysis_done = true;

    await coursework.save();

    return res.status(200).json({
      message: "Coursework skills extracted successfully.",
      courseworkId: coursework._id,
      result: {
        required_skills: coursework.ai_required_skills,
        preferred_skills: coursework.ai_preferred_skills,
        recommended_roles: coursework.ai_recommended_roles,
        difficulty: coursework.ai_difficulty,
      },
    });
  } catch (error) {
    console.error("extractCourseworkSkills error:", error);

    return res.status(500).json({
      message: "Failed to extract coursework skills.",
      error: error.message,
    });
  }
}

module.exports = {
  extractCourseworkSkills,
};
