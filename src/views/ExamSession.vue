<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LoaderCircle, Timer } from 'lucide-vue-next';
import { cn } from '@/lib/utils';
import AnswerSubmitter from '@/components/AnswerSubmitter.vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const route = useRoute();
const router = useRouter();
const api = inject<any>('api');
const id = route.params.id;

const examData = ref<any>(null);
const answers = ref<any>({});
const timeLeft = ref(0);
const cheated = ref(false);
const startTime = ref(new Date().toISOString());
const isSubmitting = ref(false);
const loading = ref(true);
const loadError = ref('');
const violationCount = ref(0);
const maxViolations = 3;
const warningMessage = ref('');
const infoMessage = ref('');
const submittingQuestions = ref<Set<number>>(new Set());
const activeQuestionId = ref<number | null>(null);

const questions = computed(() => examData.value?.questions || []);

onMounted(async () => {
  loading.value = true;
  loadError.value = '';
  try {
    const data = await api.get(`/api/exams/${id}`);
    examData.value = data;
    timeLeft.value = (Number(data.exam.duration) || Number(data.exam.duration_minutes) || 60) * 60;
    if (data?.existingSubmission && data.existingSubmission.status !== 'rejected') {
      infoMessage.value = '你已提交过该试卷，无法再次作答。';
      setTimeout(() => {
        router.push('/');
      }, 1200);
    } else if (data?.existingSubmission?.status === 'rejected') {
      infoMessage.value = '管理员已打回本次提交，请重新作答并提交。';
    }
  } catch (err: any) {
    loadError.value = err?.message || '试卷加载失败';
  } finally {
    loading.value = false;
  }
});

let timer: any;
onMounted(() => {
  timer = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--;
    } else if (examData.value) {
      handleSubmit();
    }
  }, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});

const recordViolation = (reason: string) => {
  if (!examData.value || isSubmitting.value) return;
  cheated.value = true;
  violationCount.value += 1;
  const remaining = maxViolations - violationCount.value;

  if (remaining > 0) {
    warningMessage.value = `检测到${reason}，再发生 ${remaining} 次将自动交卷。`;
    return;
  }

  warningMessage.value = '已超出允许范围，系统将自动交卷。';
  handleSubmit(true);
};

const handleBlur = () => recordViolation('离开考试页面');
const handleVisibilityChange = () => {
  if (document.hidden) {
    recordViolation('切换浏览器标签');
  }
};
const handleContextMenu = (e: any) => e.preventDefault();
const handleCopy = (e: any) => e.preventDefault();

onMounted(() => {
  window.addEventListener('blur', handleBlur);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('copy', handleCopy);
});

onUnmounted(() => {
  window.removeEventListener('blur', handleBlur);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('contextmenu', handleContextMenu);
  window.removeEventListener('copy', handleCopy);
});

const handleSubmit = async (isAuto = false) => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    await api.post(`/api/exams/${id}/submit`, {
      answers: answers.value,
      cheated: cheated.value,
      startTime: startTime.value
    });
    ElMessage.success(isAuto ? '系统已自动交卷。' : '试卷提交成功！');
    setTimeout(() => {
      router.push('/');
    }, 1500);
  } catch (err: any) {
    ElMessage.error('提交失败：' + err.message);
    isSubmitting.value = false;
  }
};

const handleManualSubmit = async () => {
  try {
    await ElMessageBox.confirm('确定要提交试卷吗？提交后将无法修改。', '确认提交', {
      confirmButtonText: '确定提交',
      cancelButtonText: '取消',
      type: 'warning'
    });
    await handleSubmit(false);
  } catch {
    // 用户取消
  }
};

const handleAnswerSubmit = async (data: any) => {
  const { questionId, answerText, file, drawingData, submissionType } = data;

  submittingQuestions.value.add(questionId);

  try {
    if (submissionType === 'text') {
      answers.value[questionId] = answerText;
      ElMessage.success('答案已保存');
    } else if (submissionType === 'file' || submissionType === 'canvas') {
      const formData = new FormData();
      formData.append('questionId', String(questionId));
      formData.append('answerText', answerText || '');

      if (file) {
        formData.append('file', file);
      }

      if (drawingData) {
        formData.append('drawingData', drawingData);
      }

      await api.post(`/api/exams/${id}/submit-answer`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      answers.value[questionId] = '已提交';
      ElMessage.success('答案已保存');
    }
  } catch (err: any) {
    ElMessage.error('答案保存失败：' + err.message);
  } finally {
    submittingQuestions.value.delete(questionId);
  }
};

const clearWarning = () => {
  warningMessage.value = '';
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const getImageUrl = (imagePath: string) => `/api/uploads/${imagePath}`;
const optionQuestionTypes = ['choice', 'multiple', 'judge'];
const textQuestionTypes = ['text', 'analysis', 'programming'];

const optionLabel = (index: number) => String.fromCharCode(65 + index);
const getQuestionTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    choice: '单选题',
    multiple: '多选题',
    judge: '判断题',
    fill: '填空题',
    text: '简答题',
    analysis: '分析题',
    programming: '编程题',
    drawing: '绘图题'
  };
  return map[type] || '题目';
};

const toggleMultipleAnswer = (questionId: number, label: string, checked: boolean) => {
  const parts = String(answers.value[questionId] || '').split(',').filter(Boolean);
  const next = checked ? [...new Set([...parts, label])] : parts.filter((item) => item !== label);
  answers.value[questionId] = next.sort().join(',');
};

const isMultipleAnswerChecked = (questionId: number, label: string) => {
  return String(answers.value[questionId] || '').split(',').includes(label);
};

const scrollToQuestion = (questionId: number) => {
  activeQuestionId.value = questionId;
  document.getElementById(`question-${questionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
</script>

<template>
  <div v-if="loading" class="min-h-screen flex items-center justify-center bg-white">
    <div class="flex flex-col items-center gap-4 text-black-600">
      <LoaderCircle class="w-8 h-8 text-gold-300 animate-spin" />
      <p class="text-sm uppercase tracking-widest">正在加载试卷...</p>
    </div>
  </div>

  <div v-else-if="loadError" class="min-h-screen flex items-center justify-center bg-white px-6">
    <div class="max-w-lg w-full border border-gold-200 bg-gold-50/60 p-8 text-center">
      <div class="text-xs uppercase tracking-widest text-gold-600 mb-3">加载失败</div>
      <h2 class="font-display text-2xl text-black-700">试卷暂时无法打开</h2>
      <p class="mt-3 text-black-500 leading-relaxed">{{ loadError }}</p>
      <button
        @click="router.push('/')"
        class="mt-6 bg-gold-300 text-black-700 px-6 py-2 font-bold uppercase tracking-wider text-sm"
      >
        返回首页
      </button>
    </div>
  </div>

  <div v-else-if="examData" class="min-h-screen bg-white pb-20 pt-20">
    <div class="fixed top-16 left-0 right-0 z-40 bg-black-700 border-b border-gold-300/30 shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
      <div class="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center gap-4">
        <div class="flex items-center space-x-4 min-w-0">
          <h2 class="font-display text-xl text-white truncate">{{ examData.exam.title }}</h2>
          <div :class="cn(
            'flex items-center px-4 py-1.5 text-sm font-bold uppercase tracking-wider',
            timeLeft < 300 ? 'bg-red-600 text-white animate-pulse' : 'bg-gold-300 text-black-700'
          )">
            <Timer class="w-4 h-4 mr-2" />
            {{ formatTime(timeLeft) }}
          </div>
          <div class="text-xs font-semibold px-3 py-1.5 bg-black-600 text-gold-300 uppercase tracking-wider">
            异常行为 {{ violationCount }}/{{ maxViolations }}
          </div>
        </div>
        <button
          @click="handleManualSubmit"
          class="bg-gold-300 text-black-700 px-6 py-2 font-bold hover:bg-white hover:text-black-700 transition-all duration-300 uppercase tracking-wider text-sm"
        >
          提交试卷
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 mt-4 space-y-3">
      <div
        v-if="warningMessage"
        class="border border-gold-300 bg-gold-50 px-4 py-3 text-gold-700 text-sm flex items-center justify-between"
      >
        <span>{{ warningMessage }}</span>
        <button class="text-xs font-semibold hover:opacity-80 uppercase tracking-wider" @click="clearWarning">知道了</button>
      </div>
      <div
        v-if="infoMessage"
        class="border border-black-200 bg-black-50 px-4 py-3 text-black-600 text-sm"
      >
        {{ infoMessage }}
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
      <aside class="lg:sticky lg:top-24 h-fit border border-black-100 bg-white p-4">
        <div class="text-xs uppercase tracking-widest text-gold-600 mb-4">题目导航</div>
        <div class="max-h-[70vh] overflow-y-auto detail-scrollbar pr-1 space-y-2">
          <button
            v-for="(q, idx) in questions"
            :key="q.id"
            @click="scrollToQuestion(q.id)"
            :class="cn(
              'w-full text-left border px-3 py-3 transition-colors',
              activeQuestionId === q.id ? 'border-gold-300 bg-gold-50' : 'border-black-100 hover:border-gold-300/50'
            )"
          >
            <div class="text-xs uppercase tracking-widest text-black-400">第 {{ idx + 1 }} 题</div>
            <div class="mt-1 text-sm text-black-700 line-clamp-2">{{ q.content }}</div>
          </button>
        </div>
      </aside>

      <section class="space-y-8">
        <div
          v-for="(q, idx) in questions"
          :key="q.id"
          :id="`question-${q.id}`"
          class="bg-white border border-black-100 p-8 hover:border-gold-300/50 transition-all duration-300"
        >
          <div class="flex items-start mb-6">
            <span class="bg-black-700 text-white w-8 h-8 flex items-center justify-center font-bold mr-4 shrink-0 font-display">
              {{ idx + 1 }}
            </span>
            <div class="space-y-1 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span :class="cn(
                  'text-xs font-bold uppercase tracking-widest px-3 py-1 border',
                  optionQuestionTypes.includes(q.type) ? 'bg-black-50 text-black-600 border-black-200' :
                  q.type === 'fill' ? 'bg-gold-50 text-gold-700 border-gold-200' :
                  q.type === 'drawing' ? 'bg-black-700 text-white border-black-700' :
                  'bg-black-50 text-black-600 border-black-200'
                )">
                  {{ getQuestionTypeLabel(q.type) }}
                </span>
                <span class="text-xs text-gold-600 font-semibold uppercase tracking-wider">{{ q.score }} 分</span>
              </div>
              <p class="text-lg text-black-700 font-medium leading-relaxed mt-2">{{ q.content }}</p>
            </div>
          </div>

          <div v-if="q.image" class="mb-6 ml-12">
            <img :src="getImageUrl(q.image)" alt="题目图片" class="max-w-full h-auto border border-black-100" />
          </div>

          <div v-if="q.type === 'choice' || q.type === 'judge'" class="grid grid-cols-1 gap-3">
            <button
              v-for="(opt, i) in q.options"
              :key="i"
              @click="answers[q.id] = optionLabel(i)"
              :class="cn(
                'flex items-center p-4 border-2 transition-all duration-200 text-left bg-white',
                answers[q.id] === optionLabel(i)
                  ? 'border-black-700 text-black-700 shadow-[0_4px_12px_rgba(0,0,0,0.16)]'
                  : 'border-black-100 hover:border-gold-300 text-black-600'
              )"
            >
              <div :class="cn(
                'w-6 h-6 border-2 mr-4 shrink-0 flex items-center justify-center',
                answers[q.id] === optionLabel(i) ? 'border-gold-300 bg-gold-300' : 'border-black-300 bg-white'
              )">
                <span v-if="answers[q.id] === optionLabel(i)" class="text-black-700 font-bold text-sm">✓</span>
              </div>
              {{ opt }}
            </button>
          </div>

          <div v-else-if="q.type === 'multiple'" class="grid grid-cols-1 gap-3">
            <label
              v-for="(opt, i) in q.options"
              :key="i"
              :class="cn(
                'flex items-center p-4 border-2 transition-all duration-200 text-left bg-white cursor-pointer',
                isMultipleAnswerChecked(q.id, optionLabel(i))
                  ? 'border-black-700 text-black-700 shadow-[0_4px_12px_rgba(0,0,0,0.16)]'
                  : 'border-black-100 hover:border-gold-300 text-black-600'
              )"
            >
              <input
                type="checkbox"
                class="w-5 h-5 mr-4 accent-gold-300"
                :checked="isMultipleAnswerChecked(q.id, optionLabel(i))"
                @change="toggleMultipleAnswer(q.id, optionLabel(i), ($event.target as HTMLInputElement).checked)"
              />
              {{ opt }}
            </label>
          </div>

          <div v-else-if="q.type === 'fill'">
            <input
              type="text"
              v-model="answers[q.id]"
              class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all"
              placeholder="请输入答案..."
            />
          </div>

          <div v-else-if="textQuestionTypes.includes(q.type)">
            <textarea
              rows="5"
              v-model="answers[q.id]"
              class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 resize-none transition-all"
              placeholder="请输入详细回答..."
            />
          </div>

          <div v-else-if="q.type === 'drawing'">
            <AnswerSubmitter
              :questionId="q.id"
              :questionType="q.type"
              :disabled="submittingQuestions.has(q.id)"
              @submit-answer="handleAnswerSubmit"
            />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
