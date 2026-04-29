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

function calculateCandidateScore(
  candidateProfile,
  skillsNeeded = [],
  creatorProfile,
) {
  const matchedSkills = getMatchedSkills(
    candidateProfile?.skills || [],
    skillsNeeded || []
  );

  const skillScore =
    skillsNeeded.length === 0 ? 1 : matchedSkills.length / skillsNeeded.length;

  const availabilityScore = getAvailabilityCompatibility(
    creatorProfile?.availability || [],
    candidateProfile?.availability || []
  );

  const ratingScore = getRatingScore(candidateProfile?.ratings || []);
  const gpaScore = getGpaScore(candidateProfile?.gpa);

  const finalScore =
    skillScore * 0.6 +
    availabilityScore * 0.2 +
    ratingScore * 0.1 +
    gpaScore * 0.1;

  return {
    score: Number((finalScore * 100).toFixed(2)),
    matchedSkills,
    breakdown: {
      skillScore: Number((skillScore * 100).toFixed(2)),
      availabilityScore: Number((availabilityScore * 100).toFixed(2)),
      ratingScore: Number((ratingScore * 100).toFixed(2)),
      gpaScore: Number((gpaScore * 100).toFixed(2)),
    },
  };
}

function buildCandidateReason(candidateProfile, matchedSkills = []) {
  const availabilityArr = normalizeAvailability(candidateProfile?.availability);

  const availability = availabilityArr.length
    ? availabilityArr.join(", ")
    : "not specified";

  if (matchedSkills.length > 0) {
    return `Covers ${matchedSkills.join(", ")} and is available during: ${availability}.`;
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