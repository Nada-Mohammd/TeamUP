const courseworkController = require("../../../src/controllers/coursework.controller");
const courseworkService = require("../../../src/services/coursework.service");

jest.mock("../../../src/services/coursework.service");

describe("Coursework Update Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { courseworkId: "cw-1" },
      user: { id: "instructor-1" },
      body: {
        name: "  Updated Coursework  ",
        description: "  Updated description  ",
        notes: "  Updated notes  ",
        grade: "95",
        team_size_min: "2",
        team_size_max: "4",
        deadline: "2026-03-01T10:00:00.000Z",
        discussion_date: "",
        include_discussion: "true",
        grading_criteria: JSON.stringify([
          { criterion: "Quality", points: 50 },
        ]),
      },
      files: [
        {
          originalname: "rubric.pdf",
          path: "https://cloudinary.com/rubric.pdf",
          size: 1024,
        },
      ],
      protocol: "http",
      get: jest.fn().mockReturnValue("localhost:5000"),
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it("updates coursework successfully with parsed/normalized payload", async () => {
    const updatedCoursework = {
      toObject: jest.fn().mockReturnValue({
        _id: "cw-1",
        name: "Updated Coursework",
        files: [
          {
            _id: "f1",
            file_name: "old.pdf",
            file_url: "https://cloudinary.com/old.pdf",
          },
          {
            _id: "f2",
            file_name: "rubric.pdf",
            file_url: "https://cloudinary.com/rubric.pdf",
          },
        ],
      }),
    };

    courseworkService.updateCoursework.mockResolvedValue(updatedCoursework);

    await courseworkController.updateCoursework(req, res);

    expect(courseworkService.updateCoursework).toHaveBeenCalledWith(
      "cw-1",
      "instructor-1",
      {
        name: "Updated Coursework",
        description: "Updated description",
        notes: "Updated notes",
        grade: 95,
        team_size_min: 2,
        team_size_max: 4,
        deadline: "2026-03-01T10:00:00.000Z",
        discussion_date: null,
        include_discussion: true,
        grading_criteria: [{ criterion: "Quality", points: 50 }],
      },
      [
        {
          file_name: "rubric.pdf",
          file_url: "https://cloudinary.com/rubric.pdf",
          file_size: 1024,
          uploaded_by: "instructor-1",
        },
      ],
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Coursework updated successfully",
      data: {
        _id: "cw-1",
        name: "Updated Coursework",
        files: [
          expect.objectContaining({
            _id: "f1",
            view_url: "http://localhost:5000/api/courseworks/cw-1/files/f1",
            download_url:
              "http://localhost:5000/api/courseworks/cw-1/files/f1?download=true",
          }),
          expect.objectContaining({
            _id: "f2",
            view_url: "http://localhost:5000/api/courseworks/cw-1/files/f2",
            download_url:
              "http://localhost:5000/api/courseworks/cw-1/files/f2?download=true",
          }),
        ],
      },
    });
  });

  it("returns 400 when required fields are missing", async () => {
    req.body.name = "";

    await courseworkController.updateCoursework(req, res);

    expect(courseworkService.updateCoursework).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Missing required fields: name and deadline.",
    });
  });

  it("defaults optional parsed fields when empty", async () => {
    req.body.description = "";
    req.body.notes = "";
    req.body.grade = "";
    req.body.team_size_min = "";
    req.body.team_size_max = "";
    req.body.include_discussion = "false";
    req.body.grading_criteria = "";
    req.files = undefined;

    const updatedCoursework = {
      toObject: jest.fn().mockReturnValue({ _id: "cw-1", files: [] }),
    };
    courseworkService.updateCoursework.mockResolvedValue(updatedCoursework);

    await courseworkController.updateCoursework(req, res);

    expect(courseworkService.updateCoursework).toHaveBeenCalledWith(
      "cw-1",
      "instructor-1",
      expect.objectContaining({
        description: "",
        notes: "",
        grade: null,
        team_size_min: null,
        team_size_max: null,
        include_discussion: false,
        grading_criteria: [],
      }),
      [],
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 400 when grading_criteria JSON is invalid", async () => {
    req.body.grading_criteria = "{invalid_json";

    await courseworkController.updateCoursework(req, res);

    expect(courseworkService.updateCoursework).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: expect.any(String),
    });
  });

  it("returns 400 when service throws", async () => {
    courseworkService.updateCoursework.mockRejectedValue(
      new Error("Service failure"),
    );

    await courseworkController.updateCoursework(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Service failure",
    });
  });
});
