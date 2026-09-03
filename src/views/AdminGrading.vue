<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import { Eye, X, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-vue-next';
import { cn } from '@/lib/utils';
import AdminSidebar from '@/components/AdminSidebar.vue';
import { ElMessage } from 'element-plus';

const api = inject<any>('api');

const submissions = ref<any[]>([]);
const selectedSubmission = ref<any>(null);
const detail = ref<any>(null);
const scores = ref<Record<string, number>>({});
const loading = ref(true);
const loadingDetail = ref(false);
const saving = ref(false);

const fetchSubmissions = async () => {
  loading.value = true;
  try {
    submissions.value = await api.get('/api/admin/grading/submissions');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchSubmissions);

const isManualQuestion = (answer: any) => ['short_answer', 'drawing'].includes(answer.questionType);

const manualAnswers = computed(() => (detail.value?.answers || []).filter((answer: any) => isManualQuestion(answer)));
const pendingCount = computed(() => submissions.value.filter((item) => item.status === 'submitted').length);
const gradedCount = computed(() => submissions.value.filter((item) => item.status === 'graded').length);

const openDetail = async (row: any) => {
  selectedSubmission.value = row;
  detail.value = null;
  scores.value = {};
  loadingDetail.value = true;

  try {
    detail.value = await api.get(`/api/admin/submissions/${row.id}`);
    for (const answer of detail.value.answers || []) {
      if (isManualQuestion(answer)) {
        scores.value[String(answer.questionId)] = Number(answer.awardedScore ?? 0);
      }
    }
  } finally {
    loadingDetail.value = false;
  }
};

const closeDetail = () => {
  selectedSubmission.value = null;
  detail.value = null;
  scores.value = {};
};

const submitGrades = async () => {
  if (!selectedSubmission.value || manualAnswers.value.length === 0) return;
  saving.value = true;

  try {
    await api.put(`/api/admin/submissions/${selectedSubmission.value.id}/grade`, {
      scores: manualAnswers.value.map((answer: any) => ({
        questionId: answer.questionId,
        awardedScore: Number(scores.value[String(answer.questionId)] ?? 0)
      }))
    });
    await fetchSubmissions();
    await openDetail({ ...selectedSubmission.value, status: 'graded' });
    ElMessage.success('批改已保存，并同步到考生端。');
  } catch (err: any) {
    ElMessage.error(err.message || '保存批改失败');
  } finally {
    saving.value = false;
  }
};

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : '-');
const formatDuration = (minutes?: number) => {
  if (minutes === null || minutes === undefined) return '-';
  if (Number(minutes) <= 0) return '不足 1 分钟';
  return `${minutes} 分钟`;
};

const getStatusLabel = (status: string) => {
  if (status === 'graded') return '已批改';
  if (status === 'rejected') return '已打回';
  return '未批改';
};

const getQuestionTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    single_choice: '单选题',
    multiple_choice: '多选题',
    fill_blank: '填空题',
    short_answer: '简答题',
    drawing: '绘图题'
  };
  return map[type] || '题目';
};

const getUploadUrl = (filename?: string) => (filename ? `/api/uploads/${filename}` : '');

const getDrawingImage = (drawing?: string) => {
  if (!drawing) return '';
  try {
    const parsed = JSON.parse(drawing);
    return parsed.imageData || '';
  } catch {
    return '';
  }
};
</script>

<template>
  <div class="admin-shell max-w-7xl mx-auto px-4 py-12">
    <div class="admin-layout flex flex-col lg:flex-row gap-8">
      <AdminSidebar />

      <main class="admin-main flex-1 min-w-0">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div class="w-16 h-0.5 bg-gold-300 mb-6"></div>
            <h1 class="font-display text-3xl text-black-700">试卷批改</h1>
            <p class="text-black-400 mt-1">查看提交记录并为主观题评分，客观题由系统自动计分</p>
          </div>

          <div class="flex items-center gap-3">
            <div class="px-4 py-2 border border-black-100 bg-white">
              <span class="text-xs text-black-400 uppercase tracking-wider">未批改</span>
              <span class="ml-2 font-mono font-bold text-gold-600">{{ pendingCount }}</span>
            </div>
            <div class="px-4 py-2 border border-black-100 bg-white">
              <span class="text-xs text-black-400 uppercase tracking-wider">已批改</span>
              <span class="ml-2 font-mono font-bold text-black-700">{{ gradedCount }}</span>
            </div>
            <button
              @click="fetchSubmissions"
              class="p-3 border border-black-200 text-black-500 hover:border-gold-300 hover:text-gold-600 transition-colors"
              title="刷新"
            >
              <RefreshCw class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="bg-white border border-black-100 overflow-x-auto">
          <table class="w-full min-w-[980px] text-left">
            <thead class="bg-black-50 border-b border-black-100">
              <tr>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">用户 ID</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">考生</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">参加考试</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">答题时间</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">提交时间</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">状态</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">成绩</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest text-right">详情</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black-50">
              <tr v-if="loading">
                <td colspan="8" class="px-6 py-12 text-center text-black-400">加载中...</td>
              </tr>
              <tr v-else-if="submissions.length === 0">
                <td colspan="8" class="px-6 py-12 text-center text-black-400">暂无提交记录</td>
              </tr>
              <template v-else>
                <tr v-for="row in submissions" :key="row.id" class="hover:bg-gold-50/30 transition-colors">
                  <td class="px-6 py-5 font-mono text-black-600">#{{ row.userId }}</td>
                  <td class="px-6 py-5">
                    <div class="font-bold text-black-700">{{ row.username }}</div>
                    <div class="text-xs text-black-400">{{ row.email }}</div>
                  </td>
                  <td class="px-6 py-5 text-black-600">{{ row.examTitle }}</td>
                  <td class="px-6 py-5 text-sm text-black-500">{{ formatDuration(row.usedTimeMinutes) }}</td>
                  <td class="px-6 py-5 text-sm text-black-500">{{ formatDate(row.submittedAt) }}</td>
                  <td class="px-6 py-5">
                    <span
                      :class="cn(
                        'inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-wider border',
                        row.status === 'graded'
                          ? 'bg-black-700 text-white border-black-700'
                          : row.status === 'rejected'
                            ? 'bg-gold-50 text-gold-700 border-gold-200'
                            : 'bg-white text-gold-700 border-gold-300'
                      )"
                    >
                      {{ getStatusLabel(row.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-5 font-mono font-bold text-gold-600">{{ row.score ?? '待批改' }}</td>
                  <td class="px-6 py-5 text-right">
                    <button
                      @click="openDetail(row)"
                      class="inline-flex items-center px-3 py-2 border border-black-200 text-black-600 hover:border-gold-300 hover:text-gold-600 transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                      <Eye class="w-4 h-4 mr-2" />
                      详情
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <div v-if="selectedSubmission" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 overflow-y-auto detail-scrollbar">
      <div v-dialog-drag="'[data-dialog-drag-handle]'" class="bg-white max-w-5xl mx-auto my-8 shadow-2xl max-h-[85vh] overflow-hidden">
        <div data-dialog-drag-handle class="sticky top-0 bg-white border-b border-black-100 p-6 flex items-start justify-between z-10 cursor-grab active:cursor-grabbing select-none">
          <div>
            <div class="text-xs font-bold text-gold-600 uppercase tracking-widest mb-2">提交详情</div>
            <h2 class="font-display text-2xl text-black-700">{{ selectedSubmission.examTitle }}</h2>
            <p class="text-sm text-black-400 mt-1">
              用户 #{{ selectedSubmission.userId }} · {{ selectedSubmission.email }} · 提交于 {{ formatDate(selectedSubmission.submittedAt) }}
            </p>
          </div>
          <button @click="closeDetail" class="p-2 text-black-400 hover:text-black-700 transition-colors">
            <X class="w-6 h-6" />
          </button>
        </div>

        <div class="max-h-[70vh] overflow-y-auto detail-scrollbar">
          <div v-if="loadingDetail" class="p-12 text-center text-black-400">加载详情中...</div>

          <div v-else-if="detail" class="p-6 space-y-5">
            <div
              v-for="(answer, index) in detail.answers"
              :key="answer.questionId"
              class="border border-black-100 bg-white p-5"
            >
              <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-3">
                    <span class="bg-black-700 text-white w-7 h-7 flex items-center justify-center text-sm font-bold font-display">
                      {{ index + 1 }}
                    </span>
                    <span class="px-3 py-1 text-xs font-bold uppercase tracking-wider border border-black-200 text-black-600">
                      {{ getQuestionTypeLabel(answer.questionType) }}
                    </span>
                    <span class="text-xs text-gold-600 font-bold uppercase tracking-wider">{{ answer.questionScore }} 分</span>
                  </div>
                  <p class="text-black-700 font-medium leading-relaxed">{{ answer.content }}</p>
                </div>

                <div v-if="!isManualQuestion(answer)" class="shrink-0">
                  <span
                    :class="cn(
                      'inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-wider border',
                      answer.isCorrect
                        ? 'bg-black-700 text-white border-black-700'
                        : 'bg-gold-50 text-gold-700 border-gold-200'
                    )"
                  >
                    <CheckCircle v-if="answer.isCorrect" class="w-3 h-3 mr-1" />
                    <AlertTriangle v-else class="w-3 h-3 mr-1" />
                    {{ answer.awardedScore ?? 0 }} / {{ answer.questionScore }}
                  </span>
                </div>
              </div>

              <div v-if="answer.questionImage" class="mb-4">
                <img :src="getUploadUrl(answer.questionImage)" alt="题目图片" class="max-h-64 border border-black-100" />
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div class="bg-black-50 border border-black-100 p-4">
                  <div class="text-xs font-bold text-black-500 uppercase tracking-wider mb-2">考生答案</div>
                  <p class="text-black-700 whitespace-pre-wrap">{{ answer.studentAnswer || '未提交文本答案' }}</p>
                  <img
                    v-if="answer.answerImage"
                    :src="getUploadUrl(answer.answerImage)"
                    alt="答案图片"
                    class="mt-4 max-h-80 border border-black-100 bg-white"
                  />
                  <img
                    v-else-if="getDrawingImage(answer.drawing)"
                    :src="getDrawingImage(answer.drawing)"
                    alt="绘图答案"
                    class="mt-4 max-h-80 border border-black-100 bg-white"
                  />
                </div>

                <div class="bg-white border border-black-100 p-4">
                  <div class="text-xs font-bold text-black-500 uppercase tracking-wider mb-2">
                    {{ isManualQuestion(answer) ? '批改分数' : '参考答案' }}
                  </div>

                  <div v-if="isManualQuestion(answer)" class="space-y-3">
                    <input
                      v-model.number="scores[String(answer.questionId)]"
                      type="number"
                      min="0"
                      :max="answer.questionScore"
                      step="0.5"
                      class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all"
                    />
                    <p class="text-xs text-black-400">请输入 0 到 {{ answer.questionScore }} 之间的分数。</p>
                  </div>

                  <p v-else class="text-black-700 whitespace-pre-wrap">{{ answer.correctAnswer || '暂无参考答案' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="sticky bottom-0 bg-white border-t border-black-100 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div class="text-sm text-black-500">
            <span v-if="manualAnswers.length === 0">这份试卷全部为客观题，系统已完成评分。</span>
            <span v-else>主观题 {{ manualAnswers.length }} 道，保存后成绩会同步到考生端。</span>
          </div>
          <div class="flex justify-end gap-3">
            <button
              @click="closeDetail"
              class="px-5 py-2 border border-black-200 text-black-600 font-semibold hover:border-gold-300 hover:text-gold-600 transition-colors uppercase tracking-wider text-sm"
            >
              关闭
            </button>
            <button
              v-if="manualAnswers.length > 0"
              @click="submitGrades"
              :disabled="saving || selectedSubmission.status === 'rejected'"
              class="px-6 py-2 bg-black-700 text-white font-bold hover:bg-gold-300 hover:text-black-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 uppercase tracking-wider text-sm"
            >
              {{ saving ? '保存中...' : '保存批改' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
