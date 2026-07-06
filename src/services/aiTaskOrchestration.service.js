const Coursework = require("../models/Coursework");
const Team = require("../models/Team");
const TeamMember = require("../models/TeamMembers");
const StudentProfile = require("../models/StudentProfile");
const Task = require("../models/Task");

const { generateTasksFromText, computeDeadlines } = require("./aiTaskGeneration.service");
const { assignTasks } = require("./aiTaskAssignment.service");
const { extractTextFromFile } = require("./fileText.service");
const axios = require("axios");

/**
 * Fetch everything needed to run generation + assignment for a team's coursework.
 */
async function loadContext(teamId) {
  const team = await Team.findById(teamId);
  if (!team) throw { statusCode: 404, message: "Team not found." };

  const coursework = await Coursework.findById(team.courseworkId);
  if (!coursework) throw { statusCode: 404, message: "Coursework not found." };

  if (coursework.deadline && new Date(coursework.deadline).getTime() <= Date.now()) {
    throw {
      statusCode: 400,
      message: "This coursework's deadline has already passed. Update the deadline before generating tasks.",
    };
  }
  if (!team) throw { statusCode: 404, message: "Team not found." };
  if (!coursework) throw { statusCode: 404, message: "Coursework not found." };

  const teamMemberDocs = await TeamMember.find({ teamId }).lean();
  if (!teamMemberDocs.length) {
    throw { statusCode: 400, message: "Team has no members." };
  }

  const memberUserIds = teamMemberDocs.map((m) => m.studentId);
  const profiles = await StudentProfile.find({ user_id: { $in: memberUserIds } }).lean();

  const members = profiles.map((p) => ({
    _id: p.user_id,
    skills: p.skills || [],
    gpa: p.gpa,
    ratings: p.ratings || [],
    first_name: p.first_name,
    last_name: p.last_name,
    profilePicture: p.profile_picture?.storagePath || null,
  }));

  if (members.length < memberUserIds.length) {
    throw {
      statusCode: 400,
      message: "One or more team members are missing a student profile.",
    };
  }

  return { team, coursework, members };
}

/**
 * Downloads a file already stored in Cloudinary and runs it through the same
 * text-extraction logic used elsewhere (extractTextFromFile).
 *
 * Builds a multer-like file object in memory ({ buffer, originalname,
 * mimetype }) so we can reuse extractTextFromFile as-is — confirmed it
 * checks file.buffer first, only falling back to file.path if buffer is
 * absent, so no changes to that shared service were needed.
 */
async function fetchStoredFileText(fileEntry) {
  const sourceUrl = fileEntry.download_url || fileEntry.file_url;

  const response = await axios.get(sourceUrl, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data);

  // Infer mimetype from file extension since Cloudinary URLs don't always
  // carry it directly in headers.
  const ext = (fileEntry.file_name || "").split(".").pop().toLowerCase();
  const mimetypeByExt = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
  };

  const pseudoMulterFile = {
    buffer,
    originalname: fileEntry.file_name,
    mimetype: mimetypeByExt[ext] || "application/octet-stream",
  };

  return extractTextFromFile(pseudoMulterFile);
}

/**
 * Resolve coursework's source text: FILE is primary, description is
 * appended as supplementary context if present.
 */
async function resolveCourseworkText(coursework) {
  let fileText = "";

  if (coursework.files && coursework.files.length > 0) {
    const latestFile = coursework.files[coursework.files.length - 1];
    fileText = (await fetchStoredFileText(latestFile)) || "";
  }

  const description = (coursework.description || "").trim();

  if (!fileText && !description) {
    throw {
      statusCode: 400,
      message: "Coursework has no file or description to generate tasks from.",
    };
  }

  if (fileText && description) {
    return `${fileText}\n\nAdditional context from coursework description:\n${description}`;
  }

  // Fall back to whichever one exists.
  return fileText || description;
}

/**
 * SHARED — Generate & assign in memory (no DB writes for tasks). Used by
 * both the initial preview and regeneration, which only differ in whether
 * previously-seen tasks are passed as an exclusion list.
 */
async function runGenerateAndAssign({ teamId, userId, excludeList = [], regenerationHint = null }) {
  const { team, coursework, members } = await loadContext(teamId);

  const isMember = members.some((m) => String(m._id) === String(userId));
  if (!isMember) {
    throw { statusCode: 403, message: "Only team members can generate tasks." };
  }

  const courseworkText = await resolveCourseworkText(coursework);

  const generatedTasks = await generateTasksFromText(courseworkText, {
    members,
    courseworkDeadline: coursework.deadline,
    excludeList,
    regenerationHint,
  });

  if (generatedTasks.length < members.length) {
    console.warn(
      `Generated ${generatedTasks.length} tasks for ${members.length} members — fewer tasks than members.`,
    );
  }

  computeDeadlines(generatedTasks, coursework.deadline);

  const { assignments, reasoning, fairness } = assignTasks(generatedTasks, members);

  const assignmentByTempId = new Map(assignments.map((a) => [a.taskId, a]));
  const reasoningByTempId = new Map(reasoning.map((r) => [r.taskTempId, r]));
  const membersById = new Map(members.map((m) => [String(m._id), m]));

  const taskCountByMember = new Map();
  for (const a of assignments) {
    const key = String(a.assigneeId);
    taskCountByMember.set(key, (taskCountByMember.get(key) || 0) + 1);
  }

  // Nothing is saved yet — this whole object is what gets shown to the
  // student, and exactly what they'll send back unchanged to /confirm
  // (or back to /regenerate as the exclusion list, if rejected).
  const taskNameByTempId = new Map(generatedTasks.map((t) => [t.tempId, t.name]));

  const previewTasks = generatedTasks.map((t) => {
    const assignment = assignmentByTempId.get(t.tempId);
    const r = reasoningByTempId.get(t.tempId);
    const assignee = assignment ? membersById.get(String(assignment.assigneeId)) : null;

    return {
      tempId: t.tempId,
      name: t.name,
      description: t.description,
      deadline: t.deadline,
      deliverableType: t.deliverableType,
      complexity: t.complexity,
      requiredSkills: t.requiredSkills,
      dependsOn: t.dependsOn || [],
      dependsOnNames: (t.dependsOn || [])
        .map((tempId) => taskNameByTempId.get(tempId))
        .filter(Boolean),
      assignee: assignee
        ? { id: assignee._id, name: assignee.first_name, profilePicture: assignee.profilePicture }
        : null,
      reasoning: r ? r.reason : null,
      isOverloaded: r ? r.isOverloaded : false,
      needsReview: r ? r.needsReview : false,
    };
  });

  // Summary used by the frontend to render one button per member (name +
  // how many tasks they'd get); clicking a button filters `tasks` client-side
  // by assignee.id.
  const membersSummary = members.map((m) => ({
    id: m._id,
    name: [m.first_name, m.last_name].filter(Boolean).join(" "),
    taskCount: taskCountByMember.get(String(m._id)) || 0,
    profilePicture: m.profilePicture,
  }));

  return {
    teamId: team._id,
    courseworkId: coursework._id,
    tasks: previewTasks,
    members: membersSummary,
    fairness: {
      isFair: fairness.isFair,
      averageLoad: fairness.avgLoad,
      message: fairness.isFair
        ? "Workload looks evenly balanced across the team."
        : "Workload isn't quite balanced yet — you may want to regenerate before confirming.",
    },
  };
}

/**
 * STEP 1 — Generate & preview (no DB writes for tasks).
 * Returns the full proposed task+assignment payload so the frontend can
 * show it to the student for review before anything is saved.
 */
async function previewGenerateAndAssign({ teamId, userId }) {
  return runGenerateAndAssign({ teamId, userId });
}

/**
 * STEP 1b — Regenerate (no DB writes for tasks).
 * Same as preview, but tells the LLM which tasks were already shown and
 * rejected so it produces a meaningfully different breakdown instead of
 * reworded duplicates.
 */
async function regenerateGenerateAndAssign({ teamId, userId, previousTasks = [], regenerationHint = null }) {
  const excludeList = (previousTasks || []).map((t) => ({
    name: t.name,
    description: t.description,
  }));
  return runGenerateAndAssign({ teamId, userId, excludeList, regenerationHint });
}

/**
 * STEP 2 — Confirm & save.
 * Takes the preview payload as-is and writes the tasks to the DB, resolving
 * dependsOn tempIds into real ObjectIds in a second pass. Assignees were
 * already validated against team membership when they were computed in
 * previewGenerateAndAssign/regenerateGenerateAndAssign, and are not editable
 * from the frontend before this call — any reassignment happens afterward,
 * on the created task, through the regular task CRUD endpoints.
 */
async function confirmAndSaveTasks({ teamId, userId, tasks }) {
  const team = await Team.findById(teamId);
  if (!team) throw { statusCode: 404, message: "Team not found." };

  const membership = await TeamMember.findOne({ teamId, studentId: userId });
  if (!membership) {
    throw { statusCode: 403, message: "Only team members can create tasks." };
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw { statusCode: 400, message: "No tasks provided to confirm." };
  }

  const tempIdToRealId = new Map();
  const savedTasks = [];

  for (const t of tasks) {
    const saved = await Task.create({
      team_id: team._id,
      creator_id: userId,
      assignee_id: t.assignee ? t.assignee.id : null,
      name: t.name,
      description: t.description,
      deadline: t.deadline,
      deliverable_type: t.deliverableType,
      status: "To Do",
      requiredSkills: t.requiredSkills || [],
      complexity: t.complexity || null,
      dependsOn: [], // resolved below
    });
    tempIdToRealId.set(t.tempId, saved._id);
    savedTasks.push({ saved, rawDependsOn: t.dependsOn || [] });
  }

  for (const { saved, rawDependsOn } of savedTasks) {
    const resolvedDeps = rawDependsOn
      .map((tempId) => tempIdToRealId.get(tempId))
      .filter(Boolean);
    if (resolvedDeps.length > 0) {
      saved.dependsOn = resolvedDeps;
      await saved.save();
    }
  }

  return savedTasks.map(({ saved }) => saved);
}

module.exports = {
  previewGenerateAndAssign,
  regenerateGenerateAndAssign,
  confirmAndSaveTasks,
};