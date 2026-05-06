function normalizeSkills(skills = []) {
  if (!Array.isArray(skills)) return [];

  return skills
    .map((skill) =>
      String(skill || "")
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);
}

function getMissingSkills(requiredSkills = [], coveredSkills = []) {
  const required = [...new Set(normalizeSkills(requiredSkills || []))];
  const covered = new Set(normalizeSkills(coveredSkills || []));

  return required.filter((skill) => !covered.has(skill));
}

function getMatchedSkills(studentSkills = [], targetSkills = []) {
  const studentSet = new Set(normalizeSkills(studentSkills || []));
  const target = [...new Set(normalizeSkills(targetSkills || []))];

  return target.filter((skill) => studentSet.has(skill));
}

function normalizeAvailability(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((a) => String(a || "").trim().toLowerCase())
      .filter(Boolean);
  }

  return [String(value).trim().toLowerCase()].filter(Boolean);
}

function getAvailabilityCompatibility(
  creatorAvailability = [],
  candidateAvailability = [],
) {
  const creator = normalizeAvailability(creatorAvailability);
  const candidate = normalizeAvailability(candidateAvailability);

  if (!creator.length || !candidate.length) return 0.4;

  const creatorAllDay = creator.includes("all day");
  const candidateAllDay = candidate.includes("all day");

  if (creatorAllDay && candidateAllDay) return 1;
  if (creatorAllDay || candidateAllDay) return 0.9;

  const overlap = creator.filter((slot) => candidate.includes(slot));

  if (overlap.length === 0) return 0.2;

  return overlap.length / Math.max(creator.length, candidate.length);
}

function getRatingScore(ratings = []) {
  if (!Array.isArray(ratings) || ratings.length === 0) {
    return 0.5;
  }

  const average =
    ratings.reduce((sum, rating) => sum + Number(rating?.stars || 0), 0) /
    ratings.length;

  return Math.min(Math.max(average / 5, 0), 1);
}

function getGpaScore(gpa) {
  if (gpa == null) {
    return 0.5;
  }

  return Math.min(Math.max(Number(gpa) / 4, 0), 1);
}

// 4th param defaults to [] → existing 3-arg calls are 100% unaffected
function calculateCandidateScore(
  candidateProfile,
  skillsNeeded = [],
  creatorProfile,
  courseworkRequiredSkills = [],  // ← optional, defaults to [] for old calls
) {
  const matchedSkills = getMatchedSkills(
    candidateProfile?.skills || [],
    skillsNeeded || [],
  );

  const skillScore =
    skillsNeeded.length === 0
      ? 1
      : matchedSkills.length / skillsNeeded.length;

  // Only runs meaningfully when 4th arg is passed, otherwise 0/0 → score = 1 (neutral)
  const courseworkMatchedSkills = getMatchedSkills(
    candidateProfile?.skills || [],
    courseworkRequiredSkills || [],
  );

  const courseworkSkillScore =
    courseworkRequiredSkills.length === 0
      ? 1
      : courseworkMatchedSkills.length / courseworkRequiredSkills.length;

  const availabilityScore = getAvailabilityCompatibility(
    creatorProfile?.availability || [],
    candidateProfile?.availability || [],
  );

  const ratingScore = getRatingScore(candidateProfile?.ratings || []);
  const gpaScore = getGpaScore(candidateProfile?.gpa);

  // When courseworkRequiredSkills=[] (old calls): courseworkSkillScore=1,
  // so the 0.15 weight just adds a flat bonus — scores stay comparable.
  // Weights: missing-skill 45% | coursework coverage 15% | availability 20% | rating 10% | gpa 10%
  const finalScore =
    skillScore           * 0.45 +
    courseworkSkillScore * 0.15 +
    availabilityScore    * 0.20 +
    ratingScore          * 0.10 +
    gpaScore             * 0.10;

  return {
    score: Number((finalScore * 100).toFixed(2)),
    matchedSkills,
    courseworkMatchedSkills,  // [] when called with 3 args — safe to spread/ignore
    breakdown: {
      skillScore:           Number((skillScore * 100).toFixed(2)),
      courseworkSkillScore: Number((courseworkSkillScore * 100).toFixed(2)),
      availabilityScore:    Number((availabilityScore * 100).toFixed(2)),
      ratingScore:          Number((ratingScore * 100).toFixed(2)),
      gpaScore:             Number((gpaScore * 100).toFixed(2)),
    },
  };
}

// Extra params default to [] / true → existing 2-arg calls are 100% unaffected
function buildCandidateReason(
  candidateProfile,
  matchedSkills = [],
  courseworkMatchedSkills = [],  // ← ignored by old calls
  hasExactMatch = true,          // ← ignored by old calls
) {
  const availabilityArr = normalizeAvailability(candidateProfile?.availability);
  const availability = availabilityArr.length
    ? availabilityArr.join(", ")
    : "not specified";

  if (!hasExactMatch) {
    if (courseworkMatchedSkills.length > 0) {
      return (
        `No students fully match your missing skills, but this student covers ` +
        `${courseworkMatchedSkills.join(", ")} from the coursework requirements ` +
        `and is available during: ${availability}.`
      );
    }
    return (
      `No strong skill match found. This student is available during: ${availability} ` +
      `and may still be a good collaborator.`
    );
  }

  if (matchedSkills.length > 0) {
    return `Covers ${matchedSkills.join(", ")} from your missing skills and is available during: ${availability}.`;
  }

  return `Weak skill match, but is available during: ${availability}.`;
}

module.exports = {
  normalizeSkills,
  getMissingSkills,
  getMatchedSkills,
  normalizeAvailability,
  getAvailabilityCompatibility,
  getRatingScore,
  getGpaScore,
  calculateCandidateScore,
  buildCandidateReason,
};