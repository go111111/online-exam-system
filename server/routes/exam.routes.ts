import { Router } from "express";
import fs from "fs";
import path from "path";
import { query } from "../db";
import { authenticateToken } from "../middleware/auth";
import { upload, uploadDir } from "../middleware/upload";
import { getExamForUser, getStudentSubmissionDetail, getSubmissionAnswers, listExamsForUser, submitExam, submitExamAnswer } from "../services/exam.service";

const router = Router();

  router.get("/api/exams", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      res.json(await listExamsForUser(userId));
    } catch (e: any) {
      console.error('Fetch exams error:', e.message || e);
      res.status(500).json({ error: "Failed to fetch exams" });
    }
  });

  // Get exam detail with questions

  router.get("/api/exams/:id", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      res.json(await getExamForUser(req.params.id, userId));
    } catch (e: any) {
      console.error('Fetch exam error:', e.message);
      res.status(e.statusCode || 500).json({ error: e.statusCode ? e.message : "Failed to fetch exam" });
    }
  });

  router.get("/api/exams/:id/submission/detail", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      res.json(await getStudentSubmissionDetail(req.params.id, userId));
    } catch (e: any) {
      console.error('Fetch student submission detail error:', e.message);
      res.status(e.statusCode || 500).json({ error: e.statusCode ? e.message : "Failed to fetch submission detail" });
    }
  });

  // Submit exam

  router.post("/api/exams/:id/submit", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      res.json(await submitExam(req.params.id, userId, req.body));
    } catch (e: any) {
      console.error('Submit exam error:', e.message);
      res.status(e.statusCode || 500).json({ error: e.statusCode ? e.message : "Failed to submit exam" });
    }
  });

  // Submit exam with file upload (for drawing or image answers)

  router.post("/api/exams/:id/submit-answer", authenticateToken, upload.single('file'), async (req, res) => {
    try {
      const userId = (req as any).user.id;
      res.json(await submitExamAnswer(req.params.id, userId, req.body, (req as any).file));
    } catch (e: any) {
      console.error('Submit answer error:', e.message);
      res.status(e.statusCode || 500).json({ error: e.statusCode ? e.message : "Failed to submit answer" });
    }
  });

  // Get submission answers (with files and drawing data)

  router.get("/api/exams/:id/submission/answers", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      res.json(await getSubmissionAnswers(req.params.id, userId));
    } catch (e: any) {
      console.error('Fetch submission answers error:', e.message);
      res.status(e.statusCode || 500).json({ error: e.statusCode ? e.message : "Failed to fetch submission answers" });
    }
  });

  // Get uploaded file

  router.get("/api/uploads/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    // 安全性检查：确保文件在 uploads 目录内
    if (!path.resolve(filePath).startsWith(path.resolve(uploadDir))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);
  });
  router.get("/api/user/results", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const rows = await query(
        `SELECT s.id,
                s.exam_id as examId,
                e.title as examTitle,
                s.total_score as score,
                s.status,
                s.cheated,
                s.submitted_at as submittedAt,
                s.scored_at as scoredAt,
                s.used_time_minutes as usedTimeMinutes
         FROM submissions s
         JOIN exams e ON s.exam_id = e.id
         WHERE s.user_id = ?
           AND s.submitted_at IS NOT NULL
         ORDER BY s.submitted_at ASC`,
        [userId]
      );

      const resultRows = Array.isArray(rows) ? rows : [];
      const enriched = [];

      for (const row of resultRows) {
        let rank: number | null = null;
        let rankedCount = 0;

        if (row.status === 'graded') {
          const rankings = await query(
            `SELECT user_id as userId, total_score as score, submitted_at as submittedAt
             FROM submissions
             WHERE exam_id = ?
               AND status = 'graded'
               AND submitted_at IS NOT NULL
             ORDER BY total_score DESC, submitted_at ASC`,
            [row.examId]
          );
          const rankingRows = Array.isArray(rankings) ? rankings : [];
          rankedCount = rankingRows.length;
          const rankIndex = rankingRows.findIndex((item: any) => Number(item.userId) === Number(userId));
          rank = rankIndex >= 0 ? rankIndex + 1 : null;
        }

        enriched.push({
          ...row,
          score: row.score === null || row.score === undefined ? null : Number(row.score),
          rank,
          rankedCount
        });
      }

      res.json(enriched);
    } catch (e: any) {
      console.error('Fetch user results error:', e.message);
      res.status(500).json({ error: "Failed to fetch user results" });
    }
  });

  // Get current user profile

  router.get("/api/user/profile", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const users = await query("SELECT id, email, full_name, role FROM users WHERE id = ?", [userId]);
      const user = Array.isArray(users) ? users[0] : users;
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (e: any) {
      console.error('Get profile error:', e.message);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });
export default router;
