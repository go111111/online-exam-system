import { Router } from "express";
import fs from "fs";
import { createUser, getOne, isUsingMySQL, query } from "../db";
import { authenticateToken, isAdmin } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { buildDefaultOptions, copyQuestionToExam, hydrateQuestion, mapQuestionType, replaceQuestionOptions } from "../services/exam.service";
import { getSubmissionForScoring, manualQuestionTypes, refreshSubmissionScore, roundToOne, toNumber, upsertAnswer } from "../services/scoring.service";
import { hashPassword } from "../utils/password";

const router = Router();

  router.get("/api/admin/exams", authenticateToken, isAdmin, async (req, res) => {
    try {
      const exams = await query("SELECT * FROM exams ORDER BY start_time DESC");
      res.json(exams);
    } catch (e: any) {
      console.error('Fetch admin exams error:', e.message || e);
      res.status(500).json({ error: "Failed to fetch admin exams" });
    }
  });

  // Create exam
// Create exam - 已修复版本

router.post("/api/admin/exams", authenticateToken, isAdmin, async (req, res) => {
    const { title, description, start_time, end_time, duration_minutes, status } = req.body;
    const userId = (req as any).user.id;

    try {
        if (!title || !start_time || !end_time) {
            return res.status(400).json({ error: "Missing required exam fields: title, start_time, end_time" });
        }

        const result = await query(
            `INSERT INTO exams (title, description, start_time, end_time, duration_minutes, status, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                title, 
                description || null, 
                start_time, 
                end_time, 
                duration_minutes || 60, 
                status || 'published', 
                userId
            ]
        );

        // 安全获取 insertId（兼容 MySQL / SQLite）
        let id = null;
        if (result && typeof result === 'object') {
            id = (result as any).insertId || (result as any).lastInsertRowid;
        }

        if (!id) {
            throw new Error("Failed to retrieve insert ID");
        }

        res.json({ id, message: "考试创建成功" });
    } catch (e: any) {
        console.error('Create exam error:', e.message || e);
        console.error('Error stack:', e.stack);
        res.status(500).json({ 
            error: "Failed to create exam", 
            message: e.message || "数据库错误" 
        });
    }
});

  // Get exam questions (admin)

  router.get("/api/admin/exams/:id/questions", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const questions = await query(
        "SELECT id, question_type as type, content, image_path as image, correct_answer as answer, score FROM questions WHERE exam_id = ? ORDER BY sort_order",
        [id]
      );
      
      const processedQuestions = await Promise.all((Array.isArray(questions) ? questions : []).map(hydrateQuestion));
      
      res.json(processedQuestions);
    } catch (e: any) {
      console.error('Fetch questions error:', e.message);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Add question

  router.post("/api/admin/exams/:id/questions", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { type, content, options, answer, score = 5, image } = req.body;
    
    try {
      if (!type || !content) {
        return res.status(400).json({ error: "Missing required question fields" });
      }

      const questionType = mapQuestionType(type);
      const finalOptions = questionType === "judgment" && (!options || options.length === 0)
        ? buildDefaultOptions(questionType)
        : options;

      // 画图题不需要 correct_answer，因为需要手动评分
      const finalAnswer = manualQuestionTypes.has(questionType) && questionType !== "short_answer" ? (answer || "") : answer;

      const result = await query(
        `INSERT INTO questions (exam_id, question_type, content, image_path, score, correct_answer, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, questionType, content, image || null, score, finalAnswer, 0]
      );
      const questionId = isUsingMySQL() ? (result as any).insertId : (result as any).insertId;

      await replaceQuestionOptions(questionId, finalOptions, finalAnswer, questionType);

      res.json({ id: questionId });
    } catch (e: any) {
      console.error('Add question error:', e.message);
      res.status(500).json({ error: "Failed to add question" });
    }
  });

  // Add question with image upload

  router.post("/api/admin/exams/:id/questions/upload", authenticateToken, isAdmin, upload.single('file'), async (req, res) => {
    const { id } = req.params;
    
    try {
      const questionData = JSON.parse(req.body.questionData || '{}');
      const { type, content, options, answer, score = 5 } = questionData;
      
      if (!type || !content) {
        if ((req as any).file) {
          fs.unlinkSync((req as any).file.path);
        }
        return res.status(400).json({ error: "Missing required question fields" });
      }

      const questionType = mapQuestionType(type);
      const finalOptions = questionType === "judgment" && (!options || options.length === 0)
        ? buildDefaultOptions(questionType)
        : options;

      const finalAnswer = manualQuestionTypes.has(questionType) && questionType !== "short_answer" ? (answer || "") : answer;
      const imagePath = (req as any).file ? (req as any).file.filename : null;

      const result = await query(
        `INSERT INTO questions (exam_id, question_type, content, image_path, score, correct_answer, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, questionType, content, imagePath, score, finalAnswer, 0]
      );
      const questionId = isUsingMySQL() ? (result as any).insertId : (result as any).insertId;

      await replaceQuestionOptions(questionId, finalOptions, finalAnswer, questionType);

      res.json({ id: questionId, imagePath });
    } catch (e: any) {
      if ((req as any).file) {
        try {
          fs.unlinkSync((req as any).file.path);
        } catch (err) {
          console.error('Failed to delete uploaded file:', err);
        }
      }
      console.error('Add question with image error:', e.message);
      res.status(500).json({ error: "Failed to add question" });
    }
  });

  // Update exam

  router.put("/api/admin/exams/:id", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, description, start_time, end_time, duration_minutes, status } = req.body;
    
    try {
      if (!title || !start_time || !end_time) {
        return res.status(400).json({ error: "Missing required exam fields" });
      }

      await query(
        `UPDATE exams SET title = ?, description = ?, start_time = ?, end_time = ?, duration_minutes = ?, status = ? WHERE id = ?`,
        [title, description, start_time, end_time, duration_minutes || 60, status || 'published', id]
      );

      res.json({ id });
    } catch (e: any) {
      console.error('Update exam error:', e.message);
      res.status(500).json({ error: "Failed to update exam" });
    }
  });

  // Delete exam

  router.delete("/api/admin/exams/:id", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
      await query("DELETE FROM exams WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Delete exam error:', e.message);
      res.status(500).json({ error: "Failed to delete exam" });
    }
  });

  // Get admin results

  router.get("/api/admin/results", authenticateToken, isAdmin, async (req, res) => {
    try {
      const results = await query(
        `SELECT s.id,
                s.user_id as userId,
                u.email,
                u.full_name as fullName,
                COALESCE(u.full_name, u.email) as username,
                e.title as examTitle,
                s.total_score as score,
                s.cheated,
                s.status,
                s.rejection_reason as rejectionReason,
                s.submitted_at as submittedAt,
                s.used_time_minutes as usedTimeMinutes,
                s.has_manual_scoring as hasManualScoring,
                s.scored_at as scoredAt
         FROM submissions s
         JOIN users u ON s.user_id = u.id
         JOIN exams e ON s.exam_id = e.id
         WHERE s.submitted_at IS NOT NULL
         ORDER BY s.submitted_at DESC`
      );
      res.json(results);
    } catch (e: any) {
      console.error('Fetch results error:', e.message);
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  // Get admin analytics overview

  router.get("/api/admin/analytics/overview", authenticateToken, isAdmin, async (_req, res) => {
    try {
      const [examCountRow, studentCountRow, submissionCountRow] = await Promise.all([
        getOne("SELECT COUNT(*) as count FROM exams"),
        getOne("SELECT COUNT(*) as count FROM users WHERE role = 'student'"),
        getOne("SELECT COUNT(*) as count FROM submissions WHERE submitted_at IS NOT NULL")
      ]);

      const exams = await query(
        `SELECT id, title, status, start_time as startTime, end_time as endTime
         FROM exams
         ORDER BY start_time DESC`
      );
      const questionTotals = await query(
        `SELECT exam_id as examId, COUNT(*) as questionCount, COALESCE(SUM(score), 0) as maxScore
         FROM questions
         GROUP BY exam_id`
      );
      const submissions = await query(
        `SELECT s.id,
                s.exam_id as examId,
                s.user_id as userId,
                s.total_score as totalScore,
                s.cheated,
                s.status,
                s.submitted_at as submittedAt,
                s.used_time_minutes as usedTimeMinutes,
                COALESCE(u.full_name, u.email) as username,
                u.email,
                e.title as examTitle
         FROM submissions s
         JOIN users u ON s.user_id = u.id
         JOIN exams e ON s.exam_id = e.id
         WHERE s.submitted_at IS NOT NULL
         ORDER BY s.submitted_at DESC`
      );

      const maxScoreByExam = new Map<number, { maxScore: number; questionCount: number }>();
      for (const row of (Array.isArray(questionTotals) ? questionTotals : [])) {
        maxScoreByExam.set(toNumber(row.examId), {
          maxScore: toNumber(row.maxScore),
          questionCount: toNumber(row.questionCount)
        });
      }

      const submittedRows = Array.isArray(submissions) ? submissions : [];
      const gradedRows = submittedRows.filter((row: any) => row.status === "graded");
      const scoredRows = gradedRows.filter((row: any) => {
        const maxScore = maxScoreByExam.get(toNumber(row.examId))?.maxScore || 0;
        return maxScore > 0 && row.totalScore !== null && row.totalScore !== undefined;
      });
      const averageScoreRate = scoredRows.length
        ? roundToOne(scoredRows.reduce((sum: number, row: any) => {
            const maxScore = maxScoreByExam.get(toNumber(row.examId))?.maxScore || 0;
            return sum + (toNumber(row.totalScore) / maxScore) * 100;
          }, 0) / scoredRows.length)
        : 0;
      const passRate = scoredRows.length
        ? roundToOne((scoredRows.filter((row: any) => {
            const maxScore = maxScoreByExam.get(toNumber(row.examId))?.maxScore || 0;
            return maxScore > 0 && toNumber(row.totalScore) / maxScore >= 0.6;
          }).length / scoredRows.length) * 100)
        : 0;

      const examPerformance = (Array.isArray(exams) ? exams : []).map((exam: any) => {
        const examId = toNumber(exam.id);
        const examSubmissions = submittedRows.filter((row: any) => toNumber(row.examId) === examId);
        const examScoredRows = examSubmissions.filter((row: any) => {
          const maxScore = maxScoreByExam.get(examId)?.maxScore || 0;
          return row.status === "graded" && maxScore > 0 && row.totalScore !== null && row.totalScore !== undefined;
        });
        const maxScore = maxScoreByExam.get(examId)?.maxScore || 0;
        const averageRate = examScoredRows.length
          ? roundToOne(examScoredRows.reduce((sum: number, row: any) => sum + (toNumber(row.totalScore) / maxScore) * 100, 0) / examScoredRows.length)
          : 0;
        const examPassRate = examScoredRows.length
          ? roundToOne((examScoredRows.filter((row: any) => toNumber(row.totalScore) / maxScore >= 0.6).length / examScoredRows.length) * 100)
          : 0;

        return {
          examId,
          title: exam.title,
          status: exam.status,
          questionCount: maxScoreByExam.get(examId)?.questionCount || 0,
          maxScore,
          submittedCount: examSubmissions.length,
          gradedCount: examScoredRows.length,
          averageScoreRate: averageRate,
          passRate: examPassRate
        };
      });

      res.json({
        totals: {
          exams: toNumber(examCountRow?.count),
          students: toNumber(studentCountRow?.count),
          submissions: toNumber(submissionCountRow?.count),
          pendingManual: submittedRows.filter((row: any) => row.status === "submitted").length,
          rejected: submittedRows.filter((row: any) => row.status === "rejected").length,
          suspicious: submittedRows.filter((row: any) => toNumber(row.cheated) === 1).length,
          averageScoreRate,
          passRate
        },
        examPerformance: examPerformance
          .sort((a: any, b: any) => b.submittedCount - a.submittedCount || b.averageScoreRate - a.averageScoreRate)
          .slice(0, 6),
        latestSubmissions: submittedRows.slice(0, 6).map((row: any) => ({
          id: row.id,
          examId: row.examId,
          userId: row.userId,
          username: row.username,
          email: row.email,
          examTitle: row.examTitle,
          totalScore: row.totalScore,
          maxScore: maxScoreByExam.get(toNumber(row.examId))?.maxScore || 0,
          status: row.status,
          cheated: Boolean(row.cheated),
          submittedAt: row.submittedAt,
          usedTimeMinutes: row.usedTimeMinutes
        }))
      });
    } catch (e: any) {
      console.error('Fetch admin analytics overview error:', e.message);
      res.status(500).json({ error: "Failed to fetch analytics overview" });
    }
  });

  // Get submissions for manual grading

  router.get("/api/admin/grading/submissions", authenticateToken, isAdmin, async (req, res) => {
    try {
      const submissions = await query(
        `SELECT s.id,
                s.user_id as userId,
                u.email,
                u.full_name as fullName,
                COALESCE(u.full_name, u.email) as username,
                e.id as examId,
                e.title as examTitle,
                s.total_score as score,
                s.cheated,
                s.status,
                s.submitted_at as submittedAt,
                s.used_time_minutes as usedTimeMinutes,
                s.has_manual_scoring as hasManualScoring,
                s.scored_at as scoredAt,
                COUNT(q.id) as questionCount,
                SUM(CASE WHEN q.question_type IN ('short_answer', 'analysis', 'programming', 'drawing') THEN 1 ELSE 0 END) as manualQuestionCount
         FROM submissions s
         JOIN users u ON s.user_id = u.id
         JOIN exams e ON s.exam_id = e.id
         LEFT JOIN questions q ON q.exam_id = e.id
         WHERE s.submitted_at IS NOT NULL
         GROUP BY s.id, s.user_id, u.email, u.full_name, e.id, e.title, s.total_score,
                  s.cheated, s.status, s.submitted_at, s.used_time_minutes,
                  s.has_manual_scoring, s.scored_at
         ORDER BY
           CASE WHEN s.status = 'submitted' THEN 0 WHEN s.status = 'graded' THEN 1 ELSE 2 END,
           s.submitted_at DESC`
      );
      res.json(submissions);
    } catch (e: any) {
      console.error('Fetch grading submissions error:', e.message);
      res.status(500).json({ error: "Failed to fetch grading submissions" });
    }
  });
  router.put("/api/admin/exams/:id/questions/:qid", authenticateToken, isAdmin, async (req, res) => {
    const { id, qid } = req.params;
    const { type, content, options, answer, score = 5, image } = req.body;
    
    try {
      if (!type || !content) {
        return res.status(400).json({ error: "Missing required question fields" });
      }

      const questionType = mapQuestionType(type);
      const finalOptions = questionType === "judgment" && (!options || options.length === 0)
        ? buildDefaultOptions(questionType)
        : options;

      // 画图题不需要 correct_answer
      const finalAnswer = manualQuestionTypes.has(questionType) && questionType !== "short_answer" ? (answer || "") : answer;

      await query(
        `UPDATE questions SET question_type = ?, content = ?, image_path = ?, correct_answer = ?, score = ? WHERE id = ? AND exam_id = ?`,
        [questionType, content, image || null, finalAnswer, score, qid, id]
      );
      
      await replaceQuestionOptions(qid, finalOptions, finalAnswer, questionType);
      
      res.json({ id: qid });
    } catch (e: any) {
      console.error('Update question error:', e.message);
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  // Update question with image upload (admin)

  router.put("/api/admin/exams/:id/questions/:qid/upload", authenticateToken, isAdmin, upload.single('file'), async (req, res) => {
    const { id, qid } = req.params;
    
    try {
      const questionData = JSON.parse(req.body.questionData || '{}');
      const { type, content, options, answer, score = 5 } = questionData;
      
      if (!type || !content) {
        if ((req as any).file) {
          fs.unlinkSync((req as any).file.path);
        }
        return res.status(400).json({ error: "Missing required question fields" });
      }

      const questionType = mapQuestionType(type);
      const finalOptions = questionType === "judgment" && (!options || options.length === 0)
        ? buildDefaultOptions(questionType)
        : options;

      const finalAnswer = manualQuestionTypes.has(questionType) && questionType !== "short_answer" ? (answer || "") : answer;
      const imagePath = (req as any).file ? (req as any).file.filename : null;

      await query(
        `UPDATE questions SET question_type = ?, content = ?, image_path = ?, correct_answer = ?, score = ? WHERE id = ? AND exam_id = ?`,
        [questionType, content, imagePath, finalAnswer, score, qid, id]
      );
      
      await replaceQuestionOptions(qid, finalOptions, finalAnswer, questionType);
      
      res.json({ id: qid, imagePath });
    } catch (e: any) {
      if ((req as any).file) {
        try {
          fs.unlinkSync((req as any).file.path);
        } catch (err) {
          console.error('Failed to delete uploaded file:', err);
        }
      }
      console.error('Update question with image error:', e.message);
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  // Delete question (admin)

  router.delete("/api/admin/exams/:id/questions/:qid", authenticateToken, isAdmin, async (req, res) => {
    const { id, qid } = req.params;
    
    try {
      await query("DELETE FROM question_options WHERE question_id = ?", [qid]);
      await query("DELETE FROM questions WHERE id = ? AND exam_id = ?", [qid, id]);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Delete question error:', e.message);
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  // Academic base data: majors

  router.get("/api/admin/academic/majors", authenticateToken, isAdmin, async (_req, res) => {
    try {
      const rows = await query(`SELECT id, name, code, description, created_at as createdAt FROM majors ORDER BY id DESC`);
      res.json(rows);
    } catch (e: any) {
      console.error('Fetch majors error:', e.message);
      res.status(500).json({ error: "Failed to fetch majors" });
    }
  });

  router.post("/api/admin/academic/majors", authenticateToken, isAdmin, async (req, res) => {
    const { name, code = "", description = "" } = req.body;
    if (!name) return res.status(400).json({ error: "专业名称不能为空" });

    try {
      const result = await query(`INSERT INTO majors (name, code, description) VALUES (?, ?, ?)`, [name, code, description]);
      res.json({ id: (result as any).insertId });
    } catch (e: any) {
      console.error('Create major error:', e.message);
      res.status(500).json({ error: "Failed to create major" });
    }
  });

  router.put("/api/admin/academic/majors/:id", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, code = "", description = "" } = req.body;
    if (!name) return res.status(400).json({ error: "专业名称不能为空" });

    try {
      await query(`UPDATE majors SET name = ?, code = ?, description = ? WHERE id = ?`, [name, code, description, id]);
      res.json({ id });
    } catch (e: any) {
      console.error('Update major error:', e.message);
      res.status(500).json({ error: "Failed to update major" });
    }
  });

  router.delete("/api/admin/academic/majors/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      await query(`UPDATE users SET major_id = NULL WHERE major_id = ?`, [req.params.id]);
      await query(`UPDATE classes SET major_id = NULL WHERE major_id = ?`, [req.params.id]);
      await query(`DELETE FROM majors WHERE id = ?`, [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Delete major error:', e.message);
      res.status(500).json({ error: "Failed to delete major" });
    }
  });

  // Academic base data: classes

  router.get("/api/admin/academic/classes", authenticateToken, isAdmin, async (_req, res) => {
    try {
      const rows = await query(
        `SELECT c.id, c.name, c.major_id as majorId, c.grade, c.description, c.created_at as createdAt,
                m.name as majorName
         FROM classes c
         LEFT JOIN majors m ON c.major_id = m.id
         ORDER BY c.id DESC`
      );
      res.json(rows);
    } catch (e: any) {
      console.error('Fetch classes error:', e.message);
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  });

  router.post("/api/admin/academic/classes", authenticateToken, isAdmin, async (req, res) => {
    const { name, majorId = null, grade = "", description = "" } = req.body;
    if (!name) return res.status(400).json({ error: "班级名称不能为空" });

    try {
      const result = await query(
        `INSERT INTO classes (name, major_id, grade, description) VALUES (?, ?, ?, ?)`,
        [name, majorId || null, grade, description]
      );
      res.json({ id: (result as any).insertId });
    } catch (e: any) {
      console.error('Create class error:', e.message);
      res.status(500).json({ error: "Failed to create class" });
    }
  });

  router.put("/api/admin/academic/classes/:id", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, majorId = null, grade = "", description = "" } = req.body;
    if (!name) return res.status(400).json({ error: "班级名称不能为空" });

    try {
      await query(
        `UPDATE classes SET name = ?, major_id = ?, grade = ?, description = ? WHERE id = ?`,
        [name, majorId || null, grade, description, id]
      );
      res.json({ id });
    } catch (e: any) {
      console.error('Update class error:', e.message);
      res.status(500).json({ error: "Failed to update class" });
    }
  });

  router.delete("/api/admin/academic/classes/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      await query(`UPDATE users SET class_id = NULL WHERE class_id = ?`, [req.params.id]);
      await query(`DELETE FROM classes WHERE id = ?`, [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Delete class error:', e.message);
      res.status(500).json({ error: "Failed to delete class" });
    }
  });

  // Question bank across exams and standalone questions

  router.get("/api/admin/question-bank", authenticateToken, isAdmin, async (req, res) => {
    const keyword = String(req.query.keyword || "").trim();
    const type = String(req.query.type || "").trim();
    const mappedType = type ? mapQuestionType(type) : "";
    const params: any[] = [];
    const where: string[] = [];

    if (keyword) {
      where.push("(q.content LIKE ? OR e.title LIKE ?)");
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (mappedType) {
      where.push("q.question_type = ?");
      params.push(mappedType);
    }

    try {
      const rows = await query(
        `SELECT q.id, q.exam_id as examId, e.title as examTitle, q.question_type as type,
                q.content, q.image_path as image, q.correct_answer as answer, q.score, q.sort_order as sortOrder
         FROM questions q
         LEFT JOIN exams e ON q.exam_id = e.id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
         ORDER BY q.id DESC`,
        params
      );
      const hydrated = await Promise.all((Array.isArray(rows) ? rows : []).map(hydrateQuestion));
      res.json(hydrated);
    } catch (e: any) {
      console.error('Fetch question bank error:', e.message);
      res.status(500).json({ error: "Failed to fetch question bank" });
    }
  });

  router.post("/api/admin/question-bank", authenticateToken, isAdmin, async (req, res) => {
    const { type, content, options, answer, score = 5, image = null } = req.body;
    const questionType = mapQuestionType(type);
    const finalOptions = questionType === "judgment" && (!options || options.length === 0)
      ? buildDefaultOptions(questionType)
      : options;

    if (!content) return res.status(400).json({ error: "题目内容不能为空" });

    try {
      const result = await query(
        `INSERT INTO questions (exam_id, question_type, content, image_path, score, correct_answer, sort_order)
         VALUES (NULL, ?, ?, ?, ?, ?, 0)`,
        [questionType, content, image, score, answer || ""]
      );
      const questionId = (result as any).insertId;
      await replaceQuestionOptions(questionId, finalOptions, answer || "", questionType);
      res.json({ id: questionId });
    } catch (e: any) {
      console.error('Create bank question error:', e.message);
      res.status(500).json({ error: "Failed to create question" });
    }
  });

  router.put("/api/admin/question-bank/:qid", authenticateToken, isAdmin, async (req, res) => {
    const { qid } = req.params;
    const { type, content, options, answer, score = 5, image = null } = req.body;
    const questionType = mapQuestionType(type);
    const finalOptions = questionType === "judgment" && (!options || options.length === 0)
      ? buildDefaultOptions(questionType)
      : options;

    if (!content) return res.status(400).json({ error: "题目内容不能为空" });

    try {
      await query(
        `UPDATE questions SET question_type = ?, content = ?, image_path = ?, correct_answer = ?, score = ? WHERE id = ?`,
        [questionType, content, image, answer || "", score, qid]
      );
      await replaceQuestionOptions(qid, finalOptions, answer || "", questionType);
      res.json({ id: qid });
    } catch (e: any) {
      console.error('Update bank question error:', e.message);
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  router.delete("/api/admin/question-bank/:qid", authenticateToken, isAdmin, async (req, res) => {
    try {
      await query(`DELETE FROM question_options WHERE question_id = ?`, [req.params.qid]);
      await query(`DELETE FROM questions WHERE id = ?`, [req.params.qid]);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Delete bank question error:', e.message);
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  router.post("/api/admin/question-bank/generate-paper", authenticateToken, isAdmin, async (req, res) => {
    const {
      title,
      description = "",
      start_time,
      end_time,
      duration_minutes = 60,
      status = "closed",
      questionIds = [],
      randomCount = 0,
      typeCounts = {}
    } = req.body;
    const adminId = (req as any).user.id;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: "试卷标题、开始时间和结束时间不能为空" });
    }

    try {
      const selected = new Set<number>((Array.isArray(questionIds) ? questionIds : []).map((item: any) => Number(item)).filter(Boolean));
      const randomOrder = isUsingMySQL() ? "RAND()" : "RANDOM()";

      for (const [clientType, count] of Object.entries(typeCounts || {})) {
        const limit = Math.max(0, Number(count || 0));
        if (!limit) continue;
        const rows = await query(
          `SELECT id FROM questions WHERE question_type = ? ORDER BY ${randomOrder} LIMIT ?`,
          [mapQuestionType(clientType), limit]
        );
        for (const row of (Array.isArray(rows) ? rows : [])) selected.add(Number(row.id));
      }

      if (Number(randomCount) > 0) {
        const rows = await query(`SELECT id FROM questions ORDER BY ${randomOrder} LIMIT ?`, [Number(randomCount)]);
        for (const row of (Array.isArray(rows) ? rows : [])) selected.add(Number(row.id));
      }

      if (selected.size === 0) {
        return res.status(400).json({ error: "请至少选择一道题或设置随机抽题数量" });
      }

      const examResult = await query(
        `INSERT INTO exams (title, description, start_time, end_time, duration_minutes, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, description, start_time, end_time, duration_minutes, status, adminId]
      );
      const examId = (examResult as any).insertId;
      let sortOrder = 1;
      for (const questionId of selected) {
        await copyQuestionToExam(questionId, examId, sortOrder++);
      }

      res.json({ id: examId, questionCount: selected.size });
    } catch (e: any) {
      console.error('Generate paper error:', e.message);
      res.status(500).json({ error: "Failed to generate paper" });
    }
  });

  // Get all users (admin)

  router.get("/api/admin/users", authenticateToken, isAdmin, async (_req, res) => {
    try {
      const users = await query(
        `SELECT u.id, u.email, u.full_name as fullName, u.role, u.student_no as studentNo,
                u.teacher_no as teacherNo, u.class_id as classId, u.major_id as majorId,
                u.phone, COALESCE(u.status, 'active') as status,
                c.name as className, m.name as majorName
         FROM users u
         LEFT JOIN classes c ON u.class_id = c.id
         LEFT JOIN majors m ON u.major_id = m.id
         ORDER BY u.id DESC`
      );
      res.json(users);
    } catch (e: any) {
      console.error('Fetch users error:', e.message);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  router.post("/api/admin/users", authenticateToken, isAdmin, async (req, res) => {
    const {
      email,
      password = "123456",
      fullName = "",
      role = "student",
      studentNo = "",
      teacherNo = "",
      classId = null,
      majorId = null,
      phone = "",
      status = "active"
    } = req.body;

    if (!email) return res.status(400).json({ error: "邮箱不能为空" });

    try {
      const exists = await getOne(`SELECT id FROM users WHERE email = ? LIMIT 1`, [String(email).toLowerCase()]);
      if (exists) return res.status(409).json({ error: "邮箱已存在" });

      const hashedPassword = hashPassword(String(password));
      await createUser(String(email), hashedPassword, fullName || email, role);
      const created = await getOne(`SELECT id FROM users WHERE email = ? LIMIT 1`, [String(email).toLowerCase()]);
      await query(
        `UPDATE users SET student_no = ?, teacher_no = ?, class_id = ?, major_id = ?, phone = ?, status = ? WHERE id = ?`,
        [studentNo, teacherNo, classId || null, majorId || null, phone, status, created.id]
      );
      res.json({ id: created.id });
    } catch (e: any) {
      console.error('Create user error:', e.message);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  router.put("/api/admin/users/:userId", authenticateToken, isAdmin, async (req, res) => {
    const { userId } = req.params;
    const {
      email,
      password = "",
      fullName = "",
      role = "student",
      studentNo = "",
      teacherNo = "",
      classId = null,
      majorId = null,
      phone = "",
      status = "active"
    } = req.body;

    if (!email) return res.status(400).json({ error: "邮箱不能为空" });

    try {
      const collision = await getOne(`SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1`, [String(email).toLowerCase(), userId]);
      if (collision) return res.status(409).json({ error: "邮箱已存在" });

      await query(
        `UPDATE users SET email = ?, full_name = ?, role = ?, student_no = ?, teacher_no = ?,
                class_id = ?, major_id = ?, phone = ?, status = ? WHERE id = ?`,
        [String(email).toLowerCase(), fullName, role, studentNo, teacherNo, classId || null, majorId || null, phone, status, userId]
      );

      if (password) {
        await query(`UPDATE users SET password = ? WHERE id = ?`, [hashPassword(String(password)), userId]);
      }

      res.json({ id: userId });
    } catch (e: any) {
      console.error('Update user error:', e.message);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  router.delete("/api/admin/users/:userId", authenticateToken, isAdmin, async (req, res) => {
    const { userId } = req.params;
    if (Number(userId) === Number((req as any).user.id)) {
      return res.status(400).json({ error: "不能删除当前登录账号" });
    }

    try {
      await query(`DELETE FROM notification_reads WHERE user_id = ?`, [userId]);
      await query(`DELETE FROM users WHERE id = ?`, [userId]);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Delete user error:', e.message);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Get user submissions (admin)

  router.get("/api/admin/users/:userId/submissions", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const submissions = await query(
        `SELECT s.id, e.title as examTitle, s.total_score as score, s.cheated, s.status, s.submitted_at
         FROM submissions s
         JOIN exams e ON s.exam_id = e.id
         WHERE s.user_id = ?
         ORDER BY s.submitted_at DESC`,
        [userId]
      );
      res.json(submissions);
    } catch (e: any) {
      console.error('Fetch user submissions error:', e.message);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Get submission detail (admin)

  router.get("/api/admin/submissions/:submissionId", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { submissionId } = req.params;
      const submissions = await query(
        `SELECT s.id,
                s.user_id as userId,
                u.email,
                u.full_name as fullName,
                COALESCE(u.full_name, u.email) as username,
                e.id as examId,
                e.title as examTitle,
                s.total_score as score,
                s.cheated,
                s.status,
                s.submitted_at as submittedAt,
                s.used_time_minutes as usedTimeMinutes,
                s.has_manual_scoring as hasManualScoring,
                s.scored_at as scoredAt,
                s.rejection_reason as rejectionReason
         FROM submissions s
         JOIN users u ON s.user_id = u.id
         JOIN exams e ON s.exam_id = e.id
         WHERE s.id = ?`,
        [submissionId]
      );
      const submission = Array.isArray(submissions) ? submissions[0] : submissions;
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Get answers
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
        [submissionId, submission.examId]
      );

      const enrichedAnswers = await Promise.all((Array.isArray(answers) ? answers : []).map(async (answer: any) => {
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

      res.json({ submission, answers: enrichedAnswers });
    } catch (e: any) {
      console.error('Fetch submission detail error:', e.message);
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  // Grade manual questions and finalize the submission score

  router.put("/api/admin/submissions/:submissionId/grade", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { scores } = req.body;
      const scorerId = (req as any).user.id;

      const submission = await getSubmissionForScoring(submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const scoreMap = new Map<string, number>();
      if (Array.isArray(scores)) {
        for (const item of scores) {
          scoreMap.set(String(item.questionId), Number(item.awardedScore));
        }
      } else if (scores && typeof scores === "object") {
        for (const [questionId, awardedScore] of Object.entries(scores)) {
          scoreMap.set(String(questionId), Number(awardedScore));
        }
      }

      const manualQuestions = await query(
        `SELECT q.id as questionId, q.score as questionScore, a.id as answerId
         FROM questions q
         LEFT JOIN answers a ON a.question_id = q.id AND a.submission_id = ?
         WHERE q.exam_id = ?
           AND q.question_type IN ('short_answer', 'analysis', 'programming', 'drawing')
         ORDER BY q.sort_order, q.id`,
        [submissionId, submission.examId]
      );

      for (const question of (Array.isArray(manualQuestions) ? manualQuestions : [])) {
        if (!scoreMap.has(String(question.questionId))) {
          return res.status(400).json({ error: "还有主观题未评分" });
        }

        const awardedScore = scoreMap.get(String(question.questionId));
        const maxScore = Number(question.questionScore || 0);
        if (awardedScore === undefined || Number.isNaN(awardedScore) || awardedScore < 0 || awardedScore > maxScore) {
          return res.status(400).json({ error: `题目 ${question.questionId} 的分数必须在 0-${maxScore} 之间` });
        }

        const answerId = question.answerId || await upsertAnswer(submissionId, question.questionId, "");
        await query(
          `UPDATE answers SET awarded_score = ?, is_correct = ? WHERE id = ?`,
          [awardedScore, awardedScore === maxScore ? 1 : 0, answerId]
        );
      }

      const grading = await refreshSubmissionScore(submissionId, scorerId, true);
      res.json({ success: true, ...grading });
    } catch (e: any) {
      console.error('Grade submission error:', e.message);
      res.status(500).json({ error: e.message || "Failed to grade submission" });
    }
  });

  // Reject a submitted paper and allow the student to retake it

  router.put("/api/admin/submissions/:submissionId/reject", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).user.id;

      await query(
        `UPDATE submissions
         SET status = 'rejected',
             rejection_reason = ?,
             rejection_by = ?,
             scored_by = NULL,
             scored_at = NULL
         WHERE id = ?`,
        [reason || '管理员要求重新作答', adminId, submissionId]
      );

      res.json({ success: true });
    } catch (e: any) {
      console.error('Reject submission error:', e.message);
      res.status(500).json({ error: "Failed to reject submission" });
    }
  });
export default router;
