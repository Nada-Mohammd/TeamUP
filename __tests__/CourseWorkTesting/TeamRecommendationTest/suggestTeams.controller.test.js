jest.mock("../../../src/services/skillNormalization.service", () => ({
  normalizeSkillsWithAI: jest.fn(),
}));
jest.mock("../../../src/services/fileText.service", () => ({
  extractTextFromFile: jest.fn(),
}));
jest.mock("../../../src/services/aiSkillExtraction.service", () => ({
  extractSkillsFromText: jest.fn(),
}));

const aiController = require("../../../src/controllers/aiCoursework.controller");
const Coursework = require("../../../src/models/Coursework");
const StudentProfile = require("../../../src/models/StudentProfile");
const TeamMember = require("../../../src/models/TeamMembers");
const Team = require("../../../src/models/Team");
const ClassProfile = require("../../../src/models/ClassProfile");
const teamRecommendationService = require("../../../src/services/teamRecommendation.service");

jest.mock("../../../src/models/Coursework");
jest.mock("../../../src/models/StudentProfile");
jest.mock("../../../src/models/TeamMembers");
jest.mock("../../../src/models/Team");
jest.mock("../../../src/models/ClassProfile");
jest.mock("../../../src/services/teamRecommendation.service");

describe("aiCourseWork.controller - suggestTeamsForStudent", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      body: {
        studentId: "64f000000000000000000001",
        courseworkId: "64f000000000000000000002",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it("returns an empty team list when there are no available teams", async () => {
    Coursework.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: "64f000000000000000000002",
        name: "Assignment 1",
        classId: "class1",
        ai_analysis_done: true,
        ai_required_skills: ["Data Mining"],
        team_size_min: 1,
        team_size_max: 3,
      }),
    });

    StudentProfile.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        user_id: "64f000000000000000000001",
        first_name: "Mona",
        last_name: "Ali",
        skills: ["Python"],
        availability: "morning",
        gpa: 3.2,
      }),
    });

    ClassProfile.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: "classProfile1" }),
    });

    TeamMember.aggregate.mockResolvedValue([]);
    Team.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });

    await aiController.suggestTeamsForStudent(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "No available teams were found for this coursework.",
        suggestedTeams: [],
      }),
    );
  });

  it("returns ranked teams when available teams exist", async () => {
    Coursework.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: "64f000000000000000000002",
        name: "Assignment 1",
        classId: "class1",
        ai_analysis_done: true,
        ai_required_skills: ["Data Mining"],
        team_size_min: 1,
        team_size_max: 3,
      }),
    });

    StudentProfile.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        user_id: "64f000000000000000000001",
        first_name: "Mona",
        last_name: "Ali",
        skills: ["Python"],
        availability: "morning",
        gpa: 3.2,
      }),
    });

    ClassProfile.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: "classProfile1" }),
    });

    TeamMember.aggregate.mockResolvedValue([]);
    Team.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          _id: "team1",
          name: "Team Alpha",
          classId: "class1",
          courseworkId: "64f000000000000000000002",
          leaderId: "leader1",
          size: 3,
          isLocked: false,
        },
      ]),
    });

    TeamMember.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { teamId: "team1", studentId: "64f000000000000000000101" },
        { teamId: "team1", studentId: "64f000000000000000000102" },
      ]),
    });

    StudentProfile.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          user_id: "64f000000000000000000101",
          first_name: "Alaa",
          last_name: "Hassan",
          skills: ["Data Mining"],
          availability: "morning",
          gpa: 3.8,
          ratings: [{ stars: 5 }],
        },
        {
          user_id: "64f000000000000000000102",
          first_name: "Sara",
          last_name: "Omar",
          skills: ["React"],
          availability: "evening",
          gpa: 3.2,
          ratings: [{ stars: 4 }],
        },
      ]),
    });

    teamRecommendationService.calculateTeamRecommendationScore.mockReturnValue({
      teamAggregateProfile: {
        skills: ["Data Mining", "React"],
        availability: ["morning", "evening"],
      },
      teamMissingSkills: ["Data Mining"],
      studentMissingSkills: ["React"],
      memberEvaluations: [
        { score: 74.5, matchedSkills: ["Data Mining"] },
        { score: 63.2, matchedSkills: ["React"] },
      ],
      baseScore: 70.0,
      vacancyBoost: 3.33,
      teamQualityBoost: 2.5,
      score: 75.83,
      breakdown: {
        aggregateScore: 72.0,
        averageMemberScore: 68.85,
        baseScore: 70.0,
        vacancyBoost: 3.33,
        teamQualityBoost: 2.5,
      },
      reason: "Team Alpha still needs Data Mining.",
    });

    await aiController.suggestTeamsForStudent(req, res);

    expect(
      teamRecommendationService.calculateTeamRecommendationScore,
    ).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedTeams: [
          expect.objectContaining({
            teamId: "team1",
            name: "Team Alpha",
            score: 75.83,
          }),
        ],
        suggestionStatus: expect.objectContaining({
          type: "match",
        }),
      }),
    );
  });
});
