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
const Team = require("../models/Team");
const ClassProfile = require("../models/ClassProfile");

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

// ─── Action 2 ────────────────────────────────────────────────────────────────
async function suggestTeamMembersForExistingTeam(req, res) {
  try {
    const { studentId, teamId, courseworkId } = req.query;

    // ── 1. Presence check ────────────────────────────────────────────────────
    if (!studentId || !teamId || !courseworkId) {
      return res.status(400).json({
        message: "studentId, teamId and courseworkId are required.",
      });
    }

    // ── 2. ObjectId validity ─────────────────────────────────────────────────
    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(teamId) ||
      !mongoose.Types.ObjectId.isValid(courseworkId)
    ) {
      return res.status(400).json({ message: "Invalid studentId, teamId or courseworkId." });
    }

    // ── 3. Fetch coursework ───────────────────────────────────────────────────
    const coursework = await Coursework.findById(courseworkId).lean();
    if (!coursework) {
      return res.status(404).json({ message: "Coursework not found." });
    }

    if (
      !coursework.ai_analysis_done ||
      !coursework.ai_required_skills ||
      coursework.ai_required_skills.length === 0
    ) {
      return res.status(400).json({ message: "Coursework skills are not extracted yet." });
    }

    // ── 4. Verify team belongs to this coursework ────────────────────────────
    const team = await Team.findOne({
      _id: teamId,
      courseworkId,
    }).lean();

    if (!team) {
      return res.status(404).json({
        message: "Team not found or does not belong to this coursework.",
      });
    }

    // ── 5. Verify requesting student is actually a member of the team ─────────
    const requestingMembership = await TeamMember.findOne({
      teamId,
      studentId,
    }).lean();

    if (!requestingMembership) {
      return res.status(403).json({
        message: "You are not a member of this team.",
      });
    }

    // ── 6. Fetch all team members' profiles ──────────────────────────────────
    const teamMemberDocs = await TeamMember.find({ teamId }).lean();
    const teamMemberUserIds = teamMemberDocs.map((m) => m.studentId);

    const teamMemberProfiles = await StudentProfile.find({
      user_id: { $in: teamMemberUserIds },
    }).lean();

    if (teamMemberProfiles.length === 0) {
      return res.status(404).json({ message: "No team member profiles found." });
    }

    // ── 7. Build aggregate team profile ──────────────────────────────────────
    //   Skills  → union (normalised lowercase for deduplication, keep originals)
    const teamSkillsSet = new Set();
    const teamSkillsDisplay = [];
    for (const profile of teamMemberProfiles) {
      for (const skill of profile.skills || []) {
        const normalised = skill.trim().toLowerCase();
        if (!teamSkillsSet.has(normalised)) {
          teamSkillsSet.add(normalised);
          teamSkillsDisplay.push(skill); // keep original casing for display
        }
      }
    }

    //   Availability → union of all unique slots
    //   getAvailabilityCompatibility already handles arrays, so pass the union
    //   directly as the "team availability" for scoring.
    const teamAvailabilitySet = new Set();
    for (const profile of teamMemberProfiles) {
      const slots = Array.isArray(profile.availability)
        ? profile.availability
        : profile.availability
        ? [profile.availability]
        : [];
      for (const slot of slots) {
        if (slot) teamAvailabilitySet.add(slot.trim().toLowerCase());
      }
    }
    const teamAvailability = [...teamAvailabilitySet];

    // Synthetic "creator" object that the shared scoring helper understands
    const teamAggregateProfile = {
      skills: teamSkillsDisplay,
      availability: teamAvailability,
    };

    // ── 8. Compute missing skills ─────────────────────────────────────────────
    const requiredSkills = coursework.ai_required_skills;
    const skillsStillNeeded = getMissingSkills(requiredSkills, teamSkillsDisplay);

    // ── 9. Build exclusion list ───────────────────────────────────────────────
    //   Exclude every student already in ANY team for this coursework
    //   (same logic as Action 1, team members are already in teams so they
    //   are naturally included in this query result too)
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
      { $project: { studentId: 1 } },
    ]);

    const excludedUserIds = new Set(
      studentsAlreadyInCourseworkTeams.map((m) => m.studentId.toString())
    );

    // ── 10. Fetch & score candidates ─────────────────────────────────────────
    const classEnrollments = await ClassProfile.find({
      classId: coursework.classId,
      classRole: "member",
    }).lean();
    
    const enrolledUserIds = classEnrollments.map((e) => e.userId.toString());
    
    const eligibleUserIds = enrolledUserIds.filter(
      (id) => !excludedUserIds.has(id)
    );
    
    const candidateProfiles = await StudentProfile.find({
      user_id: {
        $in: eligibleUserIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    }).lean();

    const suggestedStudents = candidateProfiles
    .map((profile) => {
      const result = calculateCandidateScore(
        profile,
        skillsStillNeeded,
        teamAggregateProfile,
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
    .sort((a, b) => b.score - a.score);

    // ── 11. Response ──────────────────────────────────────────────────────────
    return res.status(200).json({
      coursework: {
        id: coursework._id,
        name: coursework.name,
        requiredSkills,
        minTeamSize: coursework.team_size_min,
        maxTeamSize: coursework.team_size_max,
      },
      team: {
        teamId: team._id,
        name: team.name,
        memberCount: teamMemberProfiles.length,
        combinedSkills: teamSkillsDisplay,
        combinedAvailability: teamAvailability,
      },
      skillsStillNeeded,
      suggestedStudents,
    });
  } catch (error) {
    console.error("suggestTeamMembersForExistingTeam error:", error);
    return res.status(500).json({
      message: "Failed to suggest team members.",
      error: error.message,
    });
  }
}

module.exports = {
  extractCourseworkSkills,
  suggestTeamMembersForNewTeam,
  suggestTeamMembersForExistingTeam,
};
