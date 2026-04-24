const mongoose = require("mongoose");
const Coursework = require("../models/Coursework");
const StudentProfile = require("../models/StudentProfile");
const TeamMember = require("../models/TeamMembers");
const {
  normalizeSkillsWithAI,
} = require("../services/skillNormalization.service");
const { extractTextFromFile } = require("../services/fileText.service");
const {
  extractSkillsFromText,
} = require("../services/aiSkillExtraction.service");
const {
  getMissingSkills,
  calculateCandidateScore,
  buildCandidateReason,
} = require("../services/matching.service");

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
    const normalizedRequiredSkills = await normalizeSkillsWithAI(
      aiResult.required_skills || [],
    );

    const normalizedPreferredSkills = await normalizeSkillsWithAI(
      aiResult.preferred_skills || [],
    );

    coursework.ai_required_skills = normalizedRequiredSkills;
    coursework.ai_preferred_skills = normalizedPreferredSkills;
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
async function suggestTeamMembersForNewTeam(req, res) {
  try {
    const { studentId, courseworkId } = req.query;

    if (!studentId || !courseworkId) {
      return res.status(400).json({
        message: "studentId and courseworkId are required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(courseworkId)
    ) {
      return res.status(400).json({
        message: "Invalid studentId or courseworkId.",
      });
    }

    const coursework = await Coursework.findById(courseworkId).lean();

    if (!coursework) {
      return res.status(404).json({
        message: "Coursework not found.",
      });
    }

    if (
      !coursework.ai_analysis_done ||
      !coursework.ai_required_skills ||
      coursework.ai_required_skills.length === 0
    ) {
      return res.status(400).json({
        message: "Coursework skills are not extracted yet.",
      });
    }

    const creatorProfile = await StudentProfile.findOne({
      user_id: studentId,
    }).lean();

    if (!creatorProfile) {
      return res.status(404).json({
        message: "Student profile not found.",
      });
    }

    const existingMembership = await TeamMember.aggregate([
      {
        $match: {
          studentId: new mongoose.Types.ObjectId(studentId),
        },
      },
      {
        $lookup: {
          from: "teams",
          localField: "teamId",
          foreignField: "_id",
          as: "team",
        },
      },
      { $unwind: "$team" },
      {
        $match: {
          "team.courseworkId": new mongoose.Types.ObjectId(courseworkId),
        },
      },
    ]);

    if (existingMembership.length > 0) {
      return res.status(400).json({
        message: "You already have a team for this coursework.",
      });
    }

    const requiredSkills = coursework.ai_required_skills;

    const skillsStillNeeded = getMissingSkills(
      requiredSkills,
      creatorProfile.skills || [],
    );

    const studentsAlreadyInCourseworkTeams = await TeamMember.aggregate([
      {
        $lookup: {
          from: "teams",
          localField: "teamId",
          foreignField: "_id",
          as: "team",
        },
      },
      { $unwind: "$team" },
      {
        $match: {
          "team.courseworkId": new mongoose.Types.ObjectId(courseworkId),
        },
      },
      {
        $project: {
          studentId: 1,
        },
      },
    ]);

    const excludedUserIds = studentsAlreadyInCourseworkTeams.map((member) =>
      member.studentId.toString(),
    );

    excludedUserIds.push(studentId.toString());

    const candidateProfiles = await StudentProfile.find({
      user_id: {
        $nin: excludedUserIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    }).lean();

    const suggestedStudents = candidateProfiles
      .map((profile) => {
        const result = calculateCandidateScore(
          profile,
          skillsStillNeeded,
          creatorProfile,
        );

        return {
          studentId: profile.user_id,
          profileId: profile._id,
          name: `${profile.first_name} ${profile.last_name}`,
          username: profile.username,
          email: profile.email,
          skills: profile.skills,
          availability: profile.availability,
          gpa: profile.gpa,
          score: result.score,
          matchedSkills: result.matchedSkills,
          breakdown: result.breakdown,
          reason: buildCandidateReason(profile, result.matchedSkills),
        };
      })
      .filter((student) => student.matchedSkills.length > 0)
      .sort((a, b) => b.score - a.score);

    return res.status(200).json({
      coursework: {
        id: coursework._id,
        name: coursework.name,
        requiredSkills,
        minTeamSize: coursework.team_size_min,
        maxTeamSize: coursework.team_size_max,
      },
      creator: {
        studentId: creatorProfile.user_id,
        name: `${creatorProfile.first_name} ${creatorProfile.last_name}`,
        skills: creatorProfile.skills,
        availability: creatorProfile.availability,
        gpa: creatorProfile.gpa,
      },
      skillsStillNeeded,
      suggestedStudents,
    });
  } catch (error) {
    console.error("suggestTeamMembersForNewTeam error:", error);

    return res.status(500).json({
      message: "Failed to suggest team members.",
      error: error.message,
    });
  }
}
module.exports = {
  extractCourseworkSkills,
  suggestTeamMembersForNewTeam,
};
