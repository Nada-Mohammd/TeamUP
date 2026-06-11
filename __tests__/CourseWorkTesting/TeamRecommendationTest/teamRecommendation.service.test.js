const {
  buildTeamAggregateProfile,
  calculateTeamRecommendationScore,
} = require("../../../src/services/teamRecommendation.service");

describe("teamRecommendation.service", () => {
  it("builds a combined team profile from member profiles", () => {
    const aggregate = buildTeamAggregateProfile([
      {
        skills: ["React", "Node.js"],
        availability: "morning",
      },
      {
        skills: ["React", "MongoDB"],
        availability: ["evening", "night"],
      },
    ]);

    expect(aggregate.skills).toEqual(["React", "Node.js", "MongoDB"]);
    expect(aggregate.availability).toEqual(["morning", "evening", "night"]);
    expect(aggregate.memberCount).toBe(2);
  });

  it("calculates a team recommendation score with modifiers", () => {
    const result = calculateTeamRecommendationScore({
      studentProfile: {
        skills: ["Data Mining"],
        availability: "morning",
        gpa: 3.5,
        ratings: [{ stars: 4 }],
      },
      teamMemberProfiles: [
        {
          user_id: "member1",
          first_name: "Alaa",
          last_name: "Hassan",
          skills: ["Data Mining", "Python"],
          availability: "morning",
          gpa: 3.8,
          ratings: [{ stars: 5 }],
        },
        {
          user_id: "member2",
          first_name: "Sara",
          last_name: "Omar",
          skills: ["React"],
          availability: "evening",
          gpa: 3.2,
          ratings: [{ stars: 4 }],
        },
      ],
      teamSize: 4,
      requiredSkills: ["Data Mining", "React"],
    });

    expect(result.memberEvaluations).toHaveLength(2);
    expect(result.baseScore).toBeGreaterThan(0);
    expect(result.vacancyBoost).toBeGreaterThan(0);
    expect(result.teamQualityBoost).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(result.baseScore);
    expect(result.reason).toContain("open slot");
  });
});
