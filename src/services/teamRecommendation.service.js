const {
  calculateCandidateScore,
  getMissingSkills,
  getMatchedSkills,
  getRatingScore,
  getGpaScore,
} = require("./matching.service");

function normalizeAvailabilityValue(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((slot) =>
        String(slot || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);
  }

  return [String(value).trim().toLowerCase()].filter(Boolean);
}

function buildTeamAggregateProfile(teamMemberProfiles = []) {
  const skillsSet = new Set();
  const skillsDisplay = [];
  const availabilitySet = new Set();

  for (const profile of teamMemberProfiles) {
    for (const skill of profile?.skills || []) {
      const original = String(skill || "").trim();
      const normalized = original.toLowerCase();

      if (normalized && !skillsSet.has(normalized)) {
        skillsSet.add(normalized);
        skillsDisplay.push(original);
      }
    }

    for (const slot of normalizeAvailabilityValue(profile?.availability)) {
      availabilitySet.add(slot);
    }
  }

  return {
    skills: skillsDisplay,
    availability: [...availabilitySet],
    memberCount: teamMemberProfiles.length,
  };
}

function calculateTeamQualityScore(teamMemberProfiles = []) {
  if (!teamMemberProfiles.length) return 0;

  const ratingScores = teamMemberProfiles
    .map((profile) => {
      if (!Array.isArray(profile?.ratings) || profile.ratings.length === 0) {
        return null;
      }

      return getRatingScore(profile.ratings);
    })
    .filter((score) => score != null);

  const gpaScores = teamMemberProfiles
    .map((profile) => {
      if (profile?.gpa == null) {
        return null;
      }

      return getGpaScore(profile.gpa);
    })
    .filter((score) => score != null);

  const presentSignals = [];

  if (ratingScores.length > 0) {
    presentSignals.push(
      ratingScores.reduce((sum, score) => sum + score, 0) / ratingScores.length,
    );
  }

  if (gpaScores.length > 0) {
    presentSignals.push(
      gpaScores.reduce((sum, score) => sum + score, 0) / gpaScores.length,
    );
  }

  if (presentSignals.length === 0) {
    return 0;
  }

  return (
    presentSignals.reduce((sum, score) => sum + score, 0) /
    presentSignals.length
  );
}

function calculateTeamRatingScore(teamMemberProfiles = []) {
  if (!teamMemberProfiles.length) return 0;

  const ratingScores = teamMemberProfiles
    .map((profile) => {
      if (!Array.isArray(profile?.ratings) || profile.ratings.length === 0) {
        return null;
      }

      return getRatingScore(profile.ratings);
    })
    .filter((score) => score != null);

  if (ratingScores.length === 0) {
    return 0;
  }

  return (
    ratingScores.reduce((sum, score) => sum + score, 0) / ratingScores.length
  );
}

function calculateTeamGpaScore(teamMemberProfiles = []) {
  if (!teamMemberProfiles.length) return 0;

  const gpaScores = teamMemberProfiles
    .map((profile) => {
      if (profile?.gpa == null) {
        return null;
      }

      return getGpaScore(profile.gpa);
    })
    .filter((score) => score != null);

  if (gpaScores.length === 0) {
    return 0;
  }

  return gpaScores.reduce((sum, score) => sum + score, 0) / gpaScores.length;
}

function buildTeamRecommendationReason({
  teamName,
  teamMissingSkills = [],
  studentMissingSkills = [],
  studentSkills = [],
  memberEvaluations = [],
  openSlots = 0,
  topMember,
}) {
  const displayName = teamName ? `Team ${teamName}` : "This team";
  const strongestMember =
    topMember || [...memberEvaluations].sort((a, b) => b.score - a.score)[0];
  const strongestMatch = strongestMember?.matchedSkills?.length
    ? strongestMember.matchedSkills.join(", ")
    : "";

  if (teamMissingSkills.length > 0) {
    const gapText = teamMissingSkills.join(", ");
    const studentCanCover = getMatchedSkills(
      studentSkills || [],
      teamMissingSkills || [],
    );
    const studentValueText = studentCanCover.length
      ? ` Your skills (${studentCanCover.join(", ")}) help fill those gaps, so you still add value here.`
      : "";

    return `${displayName} still needs ${gapText}. ${strongestMatch ? `Its strongest member overlap is on ${strongestMatch}. ` : ""}It also has ${openSlots} open slot(s).${studentValueText}`.trim();
  }

  return `${displayName} already covers the coursework skills. ${strongestMatch ? `Your profile aligns best with member overlap on ${strongestMatch}. ` : ""}It also has ${openSlots} open slot(s).`.trim();
}

function calculateTeamRecommendationScore({
  studentProfile,
  teamMemberProfiles = [],
  teamSize,
  requiredSkills = [],
}) {
  const teamAggregateProfile = buildTeamAggregateProfile(teamMemberProfiles);

  const studentMissingSkills = getMissingSkills(
    requiredSkills,
    studentProfile?.skills || [],
  );

  const teamMissingSkills = getMissingSkills(
    requiredSkills,
    teamAggregateProfile.skills || [],
  );

  const aggregateResult = calculateCandidateScore(
    studentProfile,
    teamMissingSkills,
    teamAggregateProfile,
    requiredSkills,
  );

  const memberEvaluations = teamMemberProfiles.map((memberProfile) => {
    const memberResult = calculateCandidateScore(
      memberProfile,
      studentMissingSkills,
      studentProfile,
      requiredSkills,
    );

    return {
      studentId: memberProfile?.user_id,
      profileId: memberProfile?._id,
      name: `${memberProfile?.first_name || ""} ${memberProfile?.last_name || ""}`.trim(),
      username: memberProfile?.username,
      profilePicture: memberProfile?.profile_picture,
      skills: memberProfile?.skills || [],
      availability: normalizeAvailabilityValue(memberProfile?.availability),
      gpa: memberProfile?.gpa,
      ratings: memberProfile?.ratings || [],
      score: memberResult.score,
      matchedSkills: memberResult.matchedSkills,
      courseworkMatchedSkills: memberResult.courseworkMatchedSkills,
      ratingScore: memberResult.breakdown.ratingScore,
      gpaScore: memberResult.breakdown.gpaScore,
      breakdown: memberResult.breakdown,
    };
  });

  const averageMemberScore = memberEvaluations.length
    ? memberEvaluations.reduce(
        (sum, member) => sum + Number(member.score || 0),
        0,
      ) / memberEvaluations.length
    : 0;

  const baseScore = memberEvaluations.length
    ? aggregateResult.score * 0.6 + averageMemberScore * 0.4
    : aggregateResult.score;

  const memberCount = teamAggregateProfile.memberCount;
  const openSlots = Math.max(Number(teamSize || 0) - memberCount, 0);
  const vacancyFraction = teamSize ? openSlots / teamSize : 0;
  const vacancyBoost = vacancyFraction * 10;

  const teamQualityScore = calculateTeamQualityScore(teamMemberProfiles);
  const teamRatingScore = calculateTeamRatingScore(teamMemberProfiles);
  const teamGpaScore = calculateTeamGpaScore(teamMemberProfiles);
  const teamQualityBoost = teamQualityScore * 5;

  const finalScore = Math.min(
    Math.max(baseScore + vacancyBoost + teamQualityBoost, 0),
    100,
  );

  const topMember = [...memberEvaluations].sort((a, b) => b.score - a.score)[0];

  const reason = buildTeamRecommendationReason({
    teamMissingSkills,
    studentMissingSkills,
    studentSkills: studentProfile?.skills || [],
    memberEvaluations,
    openSlots,
    topMember,
  });

  return {
    teamAggregateProfile,
    studentMissingSkills,
    teamMissingSkills,
    aggregateResult,
    memberEvaluations,
    averageMemberScore: Number(averageMemberScore.toFixed(2)),
    baseScore: Number(baseScore.toFixed(2)),
    vacancyBoost: Number(vacancyBoost.toFixed(2)),
    teamQualityBoost: Number(teamQualityBoost.toFixed(2)),
    teamRatingScore: Number(teamRatingScore.toFixed(2)),
    teamGpaScore: Number(teamGpaScore.toFixed(2)),
    score: Number(finalScore.toFixed(2)),
    breakdown: {
      aggregateScore: aggregateResult.score,
      averageMemberScore: Number(averageMemberScore.toFixed(2)),
      baseScore: Number(baseScore.toFixed(2)),
      vacancyBoost: Number(vacancyBoost.toFixed(2)),
      teamQualityBoost: Number(teamQualityBoost.toFixed(2)),
      teamRatingScore: Number(teamRatingScore.toFixed(2)),
      teamGpaScore: Number(teamGpaScore.toFixed(2)),
    },
    reason,
  };
}

module.exports = {
  buildTeamAggregateProfile,
  calculateTeamQualityScore,
  calculateTeamRatingScore,
  calculateTeamGpaScore,
  calculateTeamRecommendationScore,
  buildTeamRecommendationReason,
};
