import { getOne, query } from "../db";

export const objectiveQuestionTypes = new Set(["single_choice", "multiple_choice", "judgment", "fill_blank"]);
export const manualQuestionTypes = new Set(["short_answer", "analysis", "programming", "drawing"]);

export function normalizeAnswer(answer: any, questionType?: string) {
  if (answer === null || answer === undefined) return "";

  if (Array.isArray(answer)) {
    return answer
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join("|");
  }

  const raw = String(answer).trim();
  if (!raw) return "";

  if (questionType === "multiple_choice") {
    return raw
      .split(/[,\n;，、]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join("|");
  }

  return raw.replace(/\s+/g, " ").toLowerCase();
}

export function calculateUsedTimeMinutes(startTime?: string) {
  if (!startTime) return null;
  const startedAt = Date.parse(startTime);
  if (Number.isNaN(startedAt)) return null;
  return Math.max(0, Math.ceil((Date.now() - startedAt) / 60000));
}

export const toNumber = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const roundToOne = (value: number) => Math.round(value * 10) / 10;

export async function getSubmissionForScoring(submissionId: number | string) {
  return getOne(
    `SELECT s.id, s.exam_id as examId, s.scored_by as scoredBy
     FROM submissions s
     WHERE s.id = ?`,
    [submissionId]
  );
}

export async function upsertAnswer(submissionId: number | string, questionId: number | string, studentAnswer = "") {
  const existing = await getOne(
    `SELECT id FROM answers WHERE submission_id = ? AND question_id = ? LIMIT 1`,
    [submissionId, questionId]
  );

  if (existing) {
    await query(
      `UPDATE answers SET student_answer = ?, submission_type = COALESCE(submission_type, 'text') WHERE id = ?`,
      [studentAnswer, existing.id]
    );
    return existing.id;
  }

  const result = await query(
    `INSERT INTO answers (submission_id, question_id, student_answer, submission_type) VALUES (?, ?, ?, 'text')`,
    [submissionId, questionId, studentAnswer]
  );
  return (result as any).insertId;
}

export async function refreshSubmissionScore(
  submissionId: number | string,
  scoredBy: number | null = null,
  requireManualComplete = false
) {
  const submission = await getSubmissionForScoring(submissionId);
  if (!submission) {
    throw new Error("Submission not found");
  }

  const rows = await query(
    `SELECT q.id as questionId, q.question_type as questionType, q.correct_answer as correctAnswer, q.score as questionScore,
            a.id as answerId, a.student_answer as studentAnswer, a.awarded_score as awardedScore
     FROM questions q
     LEFT JOIN answers a ON a.question_id = q.id AND a.submission_id = ?
     WHERE q.exam_id = ?
     ORDER BY q.sort_order, q.id`,
    [submissionId, submission.examId]
  );

  let totalScore = 0;
  let hasManualScoring = false;
  let manualComplete = true;

  for (const row of (Array.isArray(rows) ? rows : [])) {
    const questionScore = Number(row.questionScore || 0);

    if (objectiveQuestionTypes.has(row.questionType)) {
      const answerId = row.answerId || await upsertAnswer(submissionId, row.questionId, "");
      const isCorrect =
        normalizeAnswer(row.studentAnswer, row.questionType) !== "" &&
        normalizeAnswer(row.studentAnswer, row.questionType) === normalizeAnswer(row.correctAnswer, row.questionType);
      const awardedScore = isCorrect ? questionScore : 0;
      totalScore += awardedScore;

      await query(
        `UPDATE answers SET is_correct = ?, awarded_score = ? WHERE id = ?`,
        [isCorrect ? 1 : 0, awardedScore, answerId]
      );
      continue;
    }

    hasManualScoring = true;
    if (row.awardedScore === null || row.awardedScore === undefined) {
      manualComplete = false;
    } else {
      totalScore += Number(row.awardedScore || 0);
    }
  }

  if (requireManualComplete && hasManualScoring && !manualComplete) {
    throw new Error("还有主观题未评分");
  }

  const nextStatus = hasManualScoring && !manualComplete ? "submitted" : "graded";
  const finalScoredBy = nextStatus === "graded" ? scoredBy : null;

  if (nextStatus === "graded") {
    await query(
      `UPDATE submissions
       SET total_score = ?, has_manual_scoring = ?, status = 'graded', scored_by = ?, scored_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [totalScore, hasManualScoring ? 1 : 0, finalScoredBy, submissionId]
    );
  } else {
    await query(
      `UPDATE submissions
       SET total_score = ?, has_manual_scoring = ?, status = 'submitted', scored_by = NULL, scored_at = NULL
       WHERE id = ?`,
      [totalScore, hasManualScoring ? 1 : 0, submissionId]
    );
  }

  return {
    totalScore,
    status: nextStatus,
    hasManualScoring,
    manualComplete
  };
}
