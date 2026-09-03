export interface AdminAnalyticsTotals {
  exams: number;
  students: number;
  submissions: number;
  pendingManual: number;
  rejected: number;
  suspicious: number;
  averageScoreRate: number;
  passRate: number;
}

export interface ExamPerformanceItem {
  examId: number;
  title: string;
  status: string;
  questionCount: number;
  maxScore: number;
  submittedCount: number;
  gradedCount: number;
  averageScoreRate: number;
  passRate: number;
}

export interface LatestSubmissionItem {
  id: number;
  examId: number;
  userId: number;
  username: string;
  email: string;
  examTitle: string;
  totalScore: number | null;
  maxScore: number;
  status: string;
  cheated: boolean;
  submittedAt: string;
  usedTimeMinutes: number | null;
}

export interface AdminAnalyticsOverview {
  totals: AdminAnalyticsTotals;
  examPerformance: ExamPerformanceItem[];
  latestSubmissions: LatestSubmissionItem[];
}
