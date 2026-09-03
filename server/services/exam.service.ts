import fs from "fs";
import { getOne, query } from "../db";
import {
  calculateUsedTimeMinutes,
  refreshSubmissionScore,
  upsertAnswer,
  normalizeAnswer,
} from "./scoring.service";

export function mapQuestionType(type: string) {
  const aliases: Record<string, string> = {
    choice: "single_choice",
    single_choice: "single_choice",
    multiple: "multiple_choice",
    multiple_choice: "multiple_choice",
    judge: "judgment",
    judgment: "judgment",
    fill: "fill_blank",
    fill_blank: "fill_blank",
    text: "short_answer",
    short_answer: "short_answer",
    analysis: "analysis",
    programming: "programming",
    drawing: "drawing"
  };
  return aliases[type] || "short_answer";
}

export function toClientQuestionType(type: string) {
  const aliases: Record<string, string> = {
    single_choice: "choice",
    multiple_choice: "multiple",
    judgment: "judge",
    fill_blank: "fill",
    short_answer: "text",
    analysis: "analysis",
    programming: "programming",
    drawing: "drawing"
  };
  return aliases[type] || "text";
}

export function getQuestionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    single_choice: "单选题",
    multiple_choice: "多选题",
    judgment: "判断题",
    fill_blank: "填空题",
    short_answer: "简答题",
    analysis: "分析题",
    programming: "编程题",
    drawing: "绘图题"
  };
  return labels[type] || "题目";
}

export function normalizeQuestionOptions(options: any) {
  if (!Array.isArray(options)) return [];
  return options
    .map((item, index) => {
      if (typeof item === "string") {
        return { label: String.fromCharCode(65 + index), text: item.trim() };
      }
      return {
        label: String(item?.label || String.fromCharCode(65 + index)).trim(),
        text: String(item?.text || item?.value || "").trim()
      };
    })
    .filter((item) => item.text);
}

export async function replaceQuestionOptions(
  questionId: number | string,
  options: any,
  answer: any,
  questionType: string
) {
  await query(`DELETE FROM question_options WHERE question_id = ?`, [questionId]);

  const normalizedOptions = normalizeQuestionOptions(options);
  if (!["single_choice", "multiple_choice", "judgment"].includes(questionType) || normalizedOptions.length === 0) {
    return;
  }

  const normalizedAnswer = normalizeAnswer(answer, questionType);
  const answerParts = questionType === "multiple_choice" ? normalizedAnswer.split("|").filter(Boolean) : [normalizedAnswer];

  for (const item of normalizedOptions) {
    const labelKey = normalizeAnswer(item.label, questionType);
    const textKey = normalizeAnswer(item.text, questionType);
    const isCorrect = answerParts.includes(labelKey) || answerParts.includes(textKey);

    await query(
      `INSERT INTO question_options (question_id, option_label, option_text, is_correct) VALUES (?, ?, ?, ?)`,
      [questionId, item.label, item.text, isCorrect ? 1 : 0]
    );
  }
}

export async function hydrateQuestion(row: any) {
  const questionType = row.questionType || row.question_type || row.type;
  const opts = await query(
    "SELECT option_label as label, option_text as text, is_correct FROM question_options WHERE question_id = ? ORDER BY option_label",
    [row.id]
  );
  const options = Array.isArray(opts) ? opts : [];
  const correctOptions = options.filter((o: any) => o.is_correct);
  const answer = correctOptions.length
    ? correctOptions.map((o: any) => o.label).join(questionType === "multiple_choice" ? "," : "")
    : (row.answer || row.correctAnswer || row.correct_answer || "");

  return {
    ...row,
    type: toClientQuestionType(questionType),
    questionType,
    typeLabel: getQuestionTypeLabel(questionType),
    options: options.map((o: any) => o.text),
    optionItems: options,
    answer
  };
}

export function buildDefaultOptions(type: string) {
  if (type === "judgment") return ["正确", "错误"];
  return [];
}

export async function copyQuestionToExam(sourceQuestionId: number | string, examId: number | string, sortOrder = 0) {
  const source = await getOne(
    `SELECT question_type, content, correct_answer, score, image_path FROM questions WHERE id = ? LIMIT 1`,
    [sourceQuestionId]
  );
  if (!source) return null;

  const result = await query(
    `INSERT INTO questions (exam_id, question_type, content, correct_answer, score, sort_order, image_path)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [examId, source.question_type, source.content, source.correct_answer, source.score, sortOrder, source.image_path]
  );
  const newQuestionId = (result as any).insertId;
  const options = await query(
    `SELECT option_label, option_text, is_correct FROM question_options WHERE question_id = ? ORDER BY option_label`,
    [sourceQuestionId]
  );

  for (const option of (Array.isArray(options) ? options : [])) {
    await query(
      `INSERT INTO question_options (question_id, option_label, option_text, is_correct) VALUES (?, ?, ?, ?)`,
      [newQuestionId, option.option_label, option.option_text, option.is_correct ? 1 : 0]
    );
  }

  return newQuestionId;
}

export async function listExamsForUser(userId: number | string) {
  return query(
    `SELECT e.*,
            s.id as submission_id,
            s.status as submission_status,
            s.total_score,
            s.submitted_at,
            s.scored_at,
            s.has_manual_scoring
     FROM exams e
     LEFT JOIN submissions s
       ON s.exam_id = e.id
      AND s.user_id = ?
      AND s.submitted_at IS NOT NULL
     WHERE e.status != 'draft'
     ORDER BY e.start_time DESC`,
    [userId]
  );
}

export async function getExamForUser(examId: number | string, userId: number | string) {
  const exams = await query("SELECT * FROM exams WHERE id = ?", [examId]);
  const exam = Array.isArray(exams) ? exams[0] : exams;

  if (!exam) {
    const error = new Error("Exam not found") as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const questions = await query(
    "SELECT id, question_type as type, content, image_path as image, correct_answer as answer, score FROM questions WHERE exam_id = ? ORDER BY sort_order",
    [examId]
  );

  const processedQuestions = await Promise.all((Array.isArray(questions) ? questions : []).map(async (q: any) => {
    const qq = await hydrateQuestion(q);
    delete qq.answer;
    delete qq.correct_answer;
    return qq;
  }));

  const submissions = await query(
    `SELECT id, status, submitted_at
     FROM submissions
     WHERE exam_id = ?
       AND user_id = ?
       AND (submitted_at IS NOT NULL OR status = 'rejected')
     LIMIT 1`,
    [examId, userId]
  );
  const submission = Array.isArray(submissions) ? submissions[0] : submissions;

  return { exam, questions: processedQuestions, existingSubmission: submission || null };
}

async function enrichSubmissionAnswers(answers: any[]) {
  return Promise.all((Array.isArray(answers) ? answers : []).map(async (answer: any) => {
    if (!answer.answerId) {
      return { ...answer, files: [], drawing: null };
    }

    const files = await query(
      `SELECT id, file_name as fileName, file_size as fileSize, file_type as fileType FROM answer_files WHERE answer_id = ?`,
      [answer.answerId]
    );
    const drawing = await getOne(
      `SELECT canvas_json as canvasJson FROM drawing_data WHERE answer_id = ? LIMIT 1`,
      [answer.answerId]
    );

    return {
      ...answer,
      files: Array.isArray(files) ? files : (files ? [files] : []),
      drawing: drawing?.canvasJson || null
    };
  }));
}

export async function getStudentSubmissionDetail(examId: number | string, userId: number | string) {
  const submissions = await query(
    `SELECT s.id,
            s.exam_id as examId,
            e.title as examTitle,
            s.total_score as score,
            s.status,
            s.submitted_at as submittedAt,
            s.used_time_minutes as usedTimeMinutes,
            s.scored_at as scoredAt,
            s.rejection_reason as rejectionReason
     FROM submissions s
     JOIN exams e ON s.exam_id = e.id
     WHERE s.exam_id = ?
       AND s.user_id = ?
       AND s.submitted_at IS NOT NULL
     ORDER BY s.submitted_at DESC
     LIMIT 1`,
    [examId, userId]
  );

  const submission = Array.isArray(submissions) ? submissions[0] : submissions;
  if (!submission) {
    const error = new Error("Submission not found") as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (submission.status !== "graded") {
    const error = new Error("This exam is not graded yet") as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }

  const answers = await query(
    `SELECT q.id as questionId,
            q.question_type as questionType,
            q.content,
            q.correct_answer as correctAnswer,
            q.score as questionScore,
            q.image_path as questionImage,
            a.id as answerId,
            a.student_answer as studentAnswer,
            a.is_correct as isCorrect,
            a.awarded_score as awardedScore,
            a.answer_image_path as answerImage,
            a.submission_type as submissionType
     FROM questions q
     LEFT JOIN answers a ON a.question_id = q.id AND a.submission_id = ?
     WHERE q.exam_id = ?
     ORDER BY q.sort_order, q.id`,
    [submission.id, examId]
  );

  return { submission, answers: await enrichSubmissionAnswers(Array.isArray(answers) ? answers : []) };
}

export async function submitExam(examId: number | string, userId: number | string, payload: any) {
  const { answers, cheated, startTime } = payload;

  if (!answers) {
    const error = new Error("Missing answers") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const existing = await query(
    `SELECT id, status, submitted_at FROM submissions WHERE user_id = ? AND exam_id = ? LIMIT 1`,
    [userId, examId]
  );
  const existingSub = Array.isArray(existing) ? existing[0] : existing;

  let submissionId: number;
  if (existingSub) {
    if (existingSub.status !== "rejected" && existingSub.submitted_at) {
      const error = new Error("This exam has already been submitted") as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    submissionId = existingSub.id;
    if (existingSub.status === "rejected") {
      await query("DELETE FROM answers WHERE submission_id = ?", [submissionId]);
    }
  } else {
    const result = await query(
      `INSERT INTO submissions (user_id, exam_id, cheated, status, submitted_at) VALUES (?, ?, ?, 'submitted', NULL)`,
      [userId, examId, cheated ? 1 : 0]
    );
    submissionId = (result as any).insertId;
  }

  for (const [questionId, studentAnswer] of Object.entries(answers)) {
    await upsertAnswer(submissionId, questionId, String(studentAnswer ?? ""));
  }

  await query(
    `UPDATE submissions
     SET submitted_at = CURRENT_TIMESTAMP,
         cheated = ?,
         status = 'submitted',
         rejection_reason = NULL,
         rejection_by = NULL,
         total_score = NULL,
         has_manual_scoring = 0,
         scored_by = NULL,
         scored_at = NULL,
         used_time_minutes = ?
     WHERE id = ?`,
    [cheated ? 1 : 0, calculateUsedTimeMinutes(startTime), submissionId]
  );

  const grading = await refreshSubmissionScore(submissionId);
  return { id: submissionId, ...grading };
}

export async function submitExamAnswer(
  examId: number | string,
  userId: number | string,
  payload: any,
  file?: any
) {
  const { questionId, answerText, drawingData } = payload;

  try {
    if (!questionId) {
      const error = new Error("Missing question ID") as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const existing = await query(
      `SELECT id, status, submitted_at FROM submissions WHERE user_id = ? AND exam_id = ? LIMIT 1`,
      [userId, examId]
    );
    const existingSub = Array.isArray(existing) ? existing[0] : existing;
    let submissionId: number;

    if (existingSub) {
      if (existingSub.submitted_at && existingSub.status !== "rejected") {
        const error = new Error("This exam has already been submitted") as Error & { statusCode?: number };
        error.statusCode = 400;
        throw error;
      }

      submissionId = existingSub.id;
      if (existingSub.status === "rejected") {
        await query("DELETE FROM answers WHERE submission_id = ?", [submissionId]);
        await query(
          `UPDATE submissions
           SET status = 'submitted',
               submitted_at = NULL,
               total_score = NULL,
               rejection_reason = NULL,
               rejection_by = NULL,
               scored_by = NULL,
               scored_at = NULL
           WHERE id = ?`,
          [submissionId]
        );
      }
    } else {
      const result = await query(
        `INSERT INTO submissions (user_id, exam_id, status, submitted_at) VALUES (?, ?, 'submitted', NULL)`,
        [userId, examId]
      );
      submissionId = (result as any).insertId;
    }

    const existingAnswer = await query(
      `SELECT id FROM answers WHERE submission_id = ? AND question_id = ? LIMIT 1`,
      [submissionId, questionId]
    );
    const savedAnswer = Array.isArray(existingAnswer) ? existingAnswer[0] : existingAnswer;

    let answerId: number;

    if (savedAnswer) {
      answerId = savedAnswer.id;
      const oldFiles = await query(
        `SELECT file_path FROM answer_files WHERE answer_id = ?`,
        [answerId]
      );
      const oldFileList = Array.isArray(oldFiles) ? oldFiles : (oldFiles ? [oldFiles] : []);
      for (const oldFile of oldFileList) {
        try {
          fs.unlinkSync(oldFile.file_path);
        } catch (e) {
          console.error("Failed to delete old file:", e);
        }
      }
      await query(`DELETE FROM answer_files WHERE answer_id = ?`, [answerId]);

      const submissionType = file ? "file" : (drawingData ? "canvas" : "text");
      await query(
        `UPDATE answers SET student_answer = ?, answer_image_path = ?, submission_type = ? WHERE id = ?`,
        [answerText || "", file ? file.filename : null, submissionType, answerId]
      );
    } else {
      const submissionType = file ? "file" : (drawingData ? "canvas" : "text");
      const result = await query(
        `INSERT INTO answers (submission_id, question_id, student_answer, answer_image_path, submission_type) VALUES (?, ?, ?, ?, ?)`,
        [submissionId, questionId, answerText || "", file ? file.filename : null, submissionType]
      );
      answerId = (result as any).insertId;
    }

    if (file) {
      await query(
        `INSERT INTO answer_files (answer_id, file_name, file_path, file_size, file_type) VALUES (?, ?, ?, ?, ?)`,
        [answerId, file.originalname, file.path, file.size, file.mimetype]
      );
    }

    if (drawingData) {
      const existingDrawing = await query(
        `SELECT id FROM drawing_data WHERE answer_id = ? LIMIT 1`,
        [answerId]
      );
      const savedDrawing = Array.isArray(existingDrawing) ? existingDrawing[0] : existingDrawing;

      if (savedDrawing) {
        await query(
          `UPDATE drawing_data SET canvas_json = ? WHERE answer_id = ?`,
          [drawingData, answerId]
        );
      } else {
        await query(
          `INSERT INTO drawing_data (answer_id, canvas_json) VALUES (?, ?)`,
          [answerId, drawingData]
        );
      }
    }

    return { id: answerId, submissionId };
  } catch (e) {
    if (file) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error("Failed to delete uploaded file:", err);
      }
    }
    throw e;
  }
}

export async function getSubmissionAnswers(examId: number | string, userId: number | string) {
  const submission = await query(
    `SELECT id FROM submissions WHERE user_id = ? AND exam_id = ? LIMIT 1`,
    [userId, examId]
  );
  const savedSubmission = Array.isArray(submission) ? submission[0] : submission;

  if (!savedSubmission) {
    const error = new Error("Submission not found") as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const answers = await query(
    `SELECT a.id, a.question_id, a.student_answer, a.submission_type, a.answer_image_path
     FROM answers a
     WHERE a.submission_id = ?`,
    [savedSubmission.id]
  );

  const answersList = Array.isArray(answers) ? answers : (answers ? [answers] : []);

  return Promise.all(answersList.map(async (ans: any) => {
    const files = await query(
      `SELECT id, file_name, file_path, file_size FROM answer_files WHERE answer_id = ?`,
      [ans.id]
    );

    const drawing = await query(
      `SELECT canvas_json FROM drawing_data WHERE answer_id = ? LIMIT 1`,
      [ans.id]
    );

    const fileList = Array.isArray(files) ? files : (files ? [files] : []);
    const drawingData = Array.isArray(drawing) ? drawing[0] : drawing;

    return {
      ...ans,
      files: fileList,
      drawing: drawingData?.canvas_json || null
    };
  }));
}
