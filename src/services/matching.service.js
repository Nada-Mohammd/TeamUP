function normalizeSkills(skills = []) {
  if (!Array.isArray(skills)) return [];
  return skills
    .flatMap((skill) =>
      String(skill || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
    )
    .filter(Boolean);
}

function getMissingSkills(requiredSkills = [], coveredSkills = []) {
  const required = [...new Set(normalizeSkills(requiredSkills || []))];
  const covered  = new Set(normalizeSkills(coveredSkills || []));
  return required.filter((skill) => !covered.has(skill));
}

function getMatchedSkills(studentSkills = [], targetSkills = []) {
  const studentSet = new Set(normalizeSkills(studentSkills || []));
  const target     = [...new Set(normalizeSkills(targetSkills || []))];
  return target.filter((skill) => studentSet.has(skill));
}

function normalizeAvailability(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((a) => String(a || "").trim().toLowerCase()).filter(Boolean);
  }
  return [String(value).trim().toLowerCase()].filter(Boolean);
}

function getAvailabilityCompatibility(
  creatorAvailability = [],
  candidateAvailability = [],
) {
  const creator   = normalizeAvailability(creatorAvailability);
  const candidate = normalizeAvailability(candidateAvailability);

  if (!creator.length || !candidate.length) return 0.4;

  const creatorAllDay   = creator.includes("all day");
  const candidateAllDay = candidate.includes("all day");

  if (creatorAllDay && candidateAllDay) return 1;
  if (creatorAllDay || candidateAllDay) return 0.9;

  const overlap = creator.filter((slot) => candidate.includes(slot));
  if (overlap.length === 0) return 0.2;
  return overlap.length / Math.max(creator.length, candidate.length);
}

function getRatingScore(ratings = []) {
  if (!Array.isArray(ratings) || ratings.length === 0) return 0.5;
  const average =
    ratings.reduce((sum, r) => sum + Number(r?.stars || 0), 0) / ratings.length;
  return Math.min(Math.max(average / 5, 0), 1);
}

function getGpaScore(gpa) {
  if (gpa == null) return 0.5;
  return Math.min(Math.max(Number(gpa) / 4, 0), 1);
}

function calculateCandidateScore(
  candidateProfile,
  skillsNeeded = [],
  creatorProfile,
  courseworkRequiredSkills = [],
  semanticMatchedSkills = [],   // ← new param, defaults to []
) {
  // Merge exact + semantic matched skills
  const allMatchedSkills = [
    ...new Set([
      ...getMatchedSkills(candidateProfile?.skills || [], skillsNeeded),
      ...semanticMatchedSkills,
    ]),
  ];

  const skillScore =
    skillsNeeded.length === 0
      ? 1
      : allMatchedSkills.length / skillsNeeded.length;

  const courseworkMatchedSkills = [
    ...new Set([
      ...getMatchedSkills(candidateProfile?.skills || [], courseworkRequiredSkills),
      ...semanticMatchedSkills.filter((s) =>
        normalizeSkills(courseworkRequiredSkills).includes(s.toLowerCase())
      ),
    ]),
  ];

  const courseworkSkillScore =
    courseworkRequiredSkills.length === 0
      ? 1
      : courseworkMatchedSkills.length / courseworkRequiredSkills.length;

  const availabilityScore = getAvailabilityCompatibility(
    creatorProfile?.availability || [],
    candidateProfile?.availability || [],
  );

  const ratingScore = getRatingScore(candidateProfile?.ratings || []);
  const gpaScore    = getGpaScore(candidateProfile?.gpa);

  const finalScore =
    skillScore           * 0.40 +
    courseworkSkillScore * 0.30 +
    availabilityScore    * 0.10 +
    ratingScore          * 0.10 +
    gpaScore             * 0.10; 

  return {
    score: Number((finalScore * 100).toFixed(2)),
    matchedSkills: allMatchedSkills,
    courseworkMatchedSkills,
    breakdown: {
      skillScore:           Number((skillScore           * 100).toFixed(2)),
      courseworkSkillScore: Number((courseworkSkillScore * 100).toFixed(2)),
      availabilityScore:    Number((availabilityScore    * 100).toFixed(2)),
      ratingScore:          Number((ratingScore          * 100).toFixed(2)),
      gpaScore:             Number((gpaScore             * 100).toFixed(2)),
    },
  };
}

function buildCandidateReason(
  candidateProfile,
  matchedSkills = [],
  courseworkMatchedSkills = [],
  hasExactMatch = true,
) {
  const availabilityArr = normalizeAvailability(candidateProfile?.availability);
  const availability    = availabilityArr.length
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