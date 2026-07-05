const { normalizeSkills, getMatchedSkills } = require("./matching.service");

const COMPLEXITY_WEIGHT = { low: 1, medium: 2, high: 3 };
const MAX_SWAP_ITERATIONS = 20;
const FAIRNESS_THRESHOLD_RATIO = 0.5; // max allowed (maxLoad-minLoad)/avgLoad

/**
 * PHASE 4 — Skill score: fraction of a task's requiredSkills the member has.
 */
function getSkillScore(memberSkills, taskRequiredSkills) {
  if (!taskRequiredSkills || taskRequiredSkills.length === 0) return 1;
  const matched = getMatchedSkills(memberSkills || [], taskRequiredSkills);
  return matched.length / taskRequiredSkills.length;
}

/**
 * PHASE 5 — Tiebreaker: rating leads, GPA is secondary.
 */
function getTiebreakScore(member) {
  const ratingScore = (() => {
    const ratings = member.ratings || [];
    if (!ratings.length) return 0.5;
    const avg = ratings.reduce((s, r) => s + Number(r?.stars || 0), 0) / ratings.length;
    return Math.min(Math.max(avg / 5, 0), 1);
  })();

  const gpaScore = member.gpa == null ? 0.5 : Math.min(Math.max(Number(member.gpa) / 4, 0), 1);

  return ratingScore * 0.7 + gpaScore * 0.3;
}

/**
 * PHASE 8 — Effective load: complexity weighted by deadline urgency.
 */
function getUrgencyWeight(deadline, now = new Date()) {
  const msRemaining = new Date(deadline).getTime() - now.getTime();
  const daysRemaining = Math.max(msRemaining / (1000 * 60 * 60 * 24), 0.5);
  // Closer deadline -> higher weight. Capped so it doesn't blow up for very-soon
  // tasks, and floored so a task months out still carries meaningful weight —
  // without the floor, effective load collapses toward 0 for long coursework
  // windows, which makes the fairness ratio (a relative measure) wildly
  // unstable and disconnected from simple task-count/complexity balance.
  return Math.min(Math.max(7 / daysRemaining, 0.5), 3);
}

function getEffectiveLoad(memberId, assignments, tasksById, now = new Date()) {
  return assignments
    .filter((a) => String(a.assigneeId) === String(memberId))
    .reduce((sum, a) => {
      const task = tasksById.get(String(a.taskId));
      const complexityWeight = COMPLEXITY_WEIGHT[task.complexity] || 2;
      const urgencyWeight = getUrgencyWeight(task.deadline, now);
      return sum + complexityWeight * urgencyWeight;
    }, 0);
}

/**
 * PHASE 6 — Greedy initial assignment.
 * Hardest tasks first; for each task, pick the highest skill-score member
 * (tiebreak by rating/GPA) among those not yet over a soft per-member cap.
 */
function greedyAssign(tasks, members) {
  const assignments = []; // { taskId, assigneeId }
  const taskCountByMember = new Map(members.map((m) => [String(m._id), 0]));
  const fairShare = Math.ceil(tasks.length / members.length);

  const sortedTasks = [...tasks].sort(
    (a, b) => (COMPLEXITY_WEIGHT[b.complexity] || 2) - (COMPLEXITY_WEIGHT[a.complexity] || 2),
  );

  for (const task of sortedTasks) {
    const scored = members
      .map((m) => ({
        member: m,
        skillScore: getSkillScore(m.skills, task.requiredSkills),
        tiebreak: getTiebreakScore(m),
        currentCount: taskCountByMember.get(String(m._id)),
      }))
      .sort((a, b) => {
        if (b.skillScore !== a.skillScore) return b.skillScore - a.skillScore;
        if (b.tiebreak !== a.tiebreak) return b.tiebreak - a.tiebreak;
        return a.currentCount - b.currentCount;
      });

    // Prefer someone still under fair share; fall back to least-loaded otherwise.
    const underFairShare = scored.find((s) => s.currentCount < fairShare);
    const chosen = underFairShare || scored[0];

    assignments.push({ taskId: task.tempId, assigneeId: chosen.member._id });
    taskCountByMember.set(String(chosen.member._id), chosen.currentCount + 1);
  }

  return assignments;
}

/**
 * PHASE 7 — Zero-task failsafe: any member with nothing assigned gets a
 * reassigned task, regardless of skill score, so no one is left with zero
 * work. This is a low-confidence assignment by definition (see needsReview
 * in buildReasoning) — the candidate task is chosen to minimize the risk
 * that reassigning it creates, in priority order:
 *   1. Nothing else in the plan depends on it (reassigning a task that
 *      blocks other work risks a cascading delay if this member struggles).
 *   2. Lowest complexity (easiest to pick up with no skill match).
 *   3. Fewest of its own dependsOn (fewer prerequisites to coordinate).
 *   4. Latest deadline (most schedule slack if it runs behind).
 */
function applyZeroTaskFailsafe(assignments, tasks, members) {
  const tasksByTempId = new Map(tasks.map((t) => [t.tempId, t]));
  const assignedMemberIds = new Set(assignments.map((a) => String(a.assigneeId)));

  const idleMembers = members.filter((m) => !assignedMemberIds.has(String(m._id)));
  if (idleMembers.length === 0) return assignments;

  const dependentsCountByTempId = new Map(
    tasks.map((t) => [
      t.tempId,
      tasks.filter((other) => (other.dependsOn || []).includes(t.tempId)).length,
    ]),
  );

  for (const idleMember of idleMembers) {
    const countByMember = new Map();
    for (const a of assignments) {
      const key = String(a.assigneeId);
      countByMember.set(key, (countByMember.get(key) || 0) + 1);
    }

    // Only tasks belonging to a member who has more than one task are
    // reassignable, so no one else is left at zero in the process.
    const candidates = assignments
      .map((a, idx) => ({ a, idx, task: tasksByTempId.get(a.taskId) }))
      .filter(({ a }) => (countByMember.get(String(a.assigneeId)) || 0) > 1);

    candidates.sort((x, y) => {
      const depX = dependentsCountByTempId.get(x.task.tempId) || 0;
      const depY = dependentsCountByTempId.get(y.task.tempId) || 0;
      if (depX !== depY) return depX - depY;

      const compX = COMPLEXITY_WEIGHT[x.task.complexity] || 2;
      const compY = COMPLEXITY_WEIGHT[y.task.complexity] || 2;
      if (compX !== compY) return compX - compY;

      const ownDepsX = (x.task.dependsOn || []).length;
      const ownDepsY = (y.task.dependsOn || []).length;
      if (ownDepsX !== ownDepsY) return ownDepsX - ownDepsY;

      return new Date(y.task.deadline).getTime() - new Date(x.task.deadline).getTime();
    });

    if (candidates.length > 0) {
      assignments[candidates[0].idx].assigneeId = idleMember._id;
    }
    // If no reassignable task is found (shouldn't happen given tasks >= members),
    // this member stays idle — acceptable edge case given current constraints.
  }

  return assignments;
}

/**
 * PHASE 9 — Fairness check based on effective load variance.
 */
function checkFairness(assignments, tasks, members) {
  const tasksById = new Map(tasks.map((t) => [t.tempId, t]));
  const loads = members.map((m) => getEffectiveLoad(m._id, assignments, tasksById));
  const maxLoad = Math.max(...loads);
  const minLoad = Math.min(...loads);
  const avgLoad = loads.reduce((s, l) => s + l, 0) / loads.length || 1;

  const counts = members.map(
    (m) => assignments.filter((a) => String(a.assigneeId) === String(m._id)).length,
  );
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);

  // Load fairness alone can look fine while one person still holds visibly
  // more/fewer tasks than everyone else, so both signals must pass.
  const loadIsFair = (maxLoad - minLoad) / avgLoad <= FAIRNESS_THRESHOLD_RATIO;
  const countIsFair = maxCount - minCount <= 1;

  return { isFair: loadIsFair && countIsFair, maxLoad, minLoad, avgLoad, maxCount, minCount };
}

/**
 * PHASE 10 — Bounded swap optimization.
 * Moves tasks from the most-loaded member to the least-loaded eligible one,
 * preferring tasks related (by requiredSkills overlap) to what the receiving
 * member already has — this also naturally helps zero-skill members, since
 * task-to-task relatedness doesn't require them to have any skill match.
 */
function relatedness(taskA, taskB) {
  const a = new Set(normalizeSkills(taskA.requiredSkills || []));
  const b = new Set(normalizeSkills(taskB.requiredSkills || []));
  let overlap = 0;
  for (const s of a) if (b.has(s)) overlap++;
  return overlap;
}

function optimizeForFairness(assignments, tasks, members) {
  const tasksById = new Map(tasks.map((t) => [t.tempId, t]));
  let iterations = 0;
  let fairnessResult = checkFairness(assignments, tasks, members);

  while (!fairnessResult.isFair && iterations < MAX_SWAP_ITERATIONS) {
    const loadsByMember = members.map((m) => ({
      member: m,
      load: getEffectiveLoad(m._id, assignments, tasksById),
    }));
    loadsByMember.sort((a, b) => b.load - a.load);

    const mostLoaded = loadsByMember[0];
    const leastLoaded = loadsByMember[loadsByMember.length - 1];

    if (String(mostLoaded.member._id) === String(leastLoaded.member._id)) break;

    // Candidate tasks currently assigned to the most-loaded member.
    const candidateAssignments = assignments.filter(
      (a) => String(a.assigneeId) === String(mostLoaded.member._id),
    );

    if (candidateAssignments.length === 0) break;

    // Least-loaded member's current tasks, used to find "related" candidates.
    const leastLoadedTasks = assignments
      .filter((a) => String(a.assigneeId) === String(leastLoaded.member._id))
      .map((a) => tasksById.get(a.taskId));

    // Score each candidate by: how poorly the SENDER is matched to it (their
    // worst-fit task is the one to give away, so well-matched work stays with
    // whoever is actually good at it), then whether the receiver has any
    // skill eligibility, then relatedness to the receiver's existing work.
    const scoredCandidates = candidateAssignments.map((a) => {
      const task = tasksById.get(a.taskId);
      const senderSkillScore = getSkillScore(mostLoaded.member.skills, task.requiredSkills);
      const receiverSkillScore = getSkillScore(leastLoaded.member.skills, task.requiredSkills);
      const maxRelatedness = leastLoadedTasks.length
        ? Math.max(0, ...leastLoadedTasks.map((t) => relatedness(t, task)))
        : 0;
      return { assignment: a, task, senderSkillScore, receiverSkillScore, maxRelatedness };
    });

    scoredCandidates.sort((x, y) => {
      if (x.senderSkillScore !== y.senderSkillScore) return x.senderSkillScore - y.senderSkillScore;
      const xEligible = x.receiverSkillScore > 0 ? 1 : 0;
      const yEligible = y.receiverSkillScore > 0 ? 1 : 0;
      if (yEligible !== xEligible) return yEligible - xEligible;
      return y.maxRelatedness - x.maxRelatedness;
    });

    const chosen = scoredCandidates[0];
    const previousAssigneeId = chosen.assignment.assigneeId;
    chosen.assignment.assigneeId = leastLoaded.member._id;

    const candidateResult = checkFairness(assignments, tasks, members);
    const gapBefore = fairnessResult.maxLoad - fairnessResult.minLoad;
    const gapAfter = candidateResult.maxLoad - candidateResult.minLoad;

    // Only keep the swap if it actually narrows the gap; otherwise undo it
    // and stop, rather than thrashing between the same members for the rest
    // of the iteration budget without ever converging.
    if (gapAfter >= gapBefore) {
      chosen.assignment.assigneeId = previousAssigneeId;
      break;
    }

    iterations++;
    fairnessResult = candidateResult;
  }

  return {
    assignments,
    fairnessResult,
    iterationsUsed: iterations,
  };
}

/**
 * PHASE 11 — Build per-assignment human-readable reasoning + overload flags.
 */
function buildReasoning(assignments, tasks, members, fairnessResult) {
  const tasksById = new Map(tasks.map((t) => [t.tempId, t]));
  const membersById = new Map(members.map((m) => [String(m._id), m]));
  const loadByMember = new Map(
    members.map((m) => [String(m._id), getEffectiveLoad(m._id, assignments, tasksById)]),
  );

  return assignments.map((a) => {
    const task = tasksById.get(a.taskId);
    const member = membersById.get(String(a.assigneeId));
    const skillScore = getSkillScore(member.skills, task.requiredSkills);
    const matched = getMatchedSkills(member.skills || [], task.requiredSkills || []);
    const load = loadByMember.get(String(a.assigneeId));
    const isOverloaded = load > fairnessResult.avgLoad * (1 + FAIRNESS_THRESHOLD_RATIO);

    const needsReview = skillScore === 0;

    let reason;
    if (task.requiredSkills.length === 0) {
      reason = `Assigned to ${member.first_name} — no specific skills required for this task.`;
    } else if (matched.length === 0) {
      reason = `Low-confidence assignment: ${member.first_name} has no direct skill match for this task. The system could not find a strong match — assignment still proceeds automatically, but please review before confirming.`;
    } else {
      reason = `Assigned to ${member.first_name} — matches ${matched.length}/${task.requiredSkills.length} required skills (${matched.join(", ")}).`;
    }

    if (isOverloaded) {
      reason += " Note: this member currently has a higher-than-average workload.";
    }

    return {
      taskTempId: a.taskId,
      assigneeId: a.assigneeId,
      skillScore,
      reason,
      isOverloaded,
      needsReview,
    };
  });
}

/**
 * MAIN ENTRY POINT for assignment — reusable by both "generate & assign"
 * and (later) "assign only", since it just takes tasks + members in and
 * returns assignments out, with no knowledge of where the tasks came from.
 */
function assignTasks(tasks, members) {
  let assignments = greedyAssign(tasks, members);
  assignments = applyZeroTaskFailsafe(assignments, tasks, members);

  const optimized = optimizeForFairness(assignments, tasks, members);
  const reasoning = buildReasoning(optimized.assignments, tasks, members, optimized.fairnessResult);

  return {
    assignments: optimized.assignments,
    reasoning,
    fairness: optimized.fairnessResult,
    swapIterationsUsed: optimized.iterationsUsed,
  };
}

module.exports = {
  assignTasks,
  getSkillScore,
  getEffectiveLoad,
};