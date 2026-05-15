<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Timer } from 'lucide-vue-next';
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
const violationCount = ref(0);
const maxViolations = 3;
const warningMessage = ref('');
const infoMessage = ref('');
const submittingQuestions = ref<Set<number>>(new Set());

onMounted(async () => {
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
    alert(err.message);
    router.push('/');
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

  warningMessage.value = `超出允许范围，系统已自动交卷。`;
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
    ElMessage.success(isAuto ? '系统已自动交卷。' : '试卷已提交成功！');
    setTimeout(() => {
      router.push('/');
    }, 1500);
  } catch (err: any) {
    ElMessage.error('提交失败: ' + err.message);
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
    ElMessage.error('答案保存失败: ' + err.message);
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

const getImageUrl = (imagePath: string) => {
  return `/api/uploads/${imagePath}`;
};
</script>

<template>
  <div v-if="examData" class="min-h-screen bg-white pb-20">
    <!-- 顶部导航栏 -->
    <div class="bg-black-700 border-b border-gold-300/30 sticky top-0 z-40">
      <div class="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
        <div class="flex items-center space-x-4">
          <h2 class="font-display text-xl text-white">{{ examData.exam.title }}</h2>
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

    <!-- 警告信息 -->
    <div class="max-w-3xl mx-auto px-4 mt-4 space-y-3">
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

    <!-- 题目列表 -->
    <div class="max-w-3xl mx-auto px-4 mt-8 space-y-8">
      <div v-for="(q, idx) in examData.questions" :key="q.id" class="bg-white border border-black-100 p-8 hover:border-gold-300/50 transition-all duration-300">
        <div class="flex items-start mb-6">
          <span class="bg-black-700 text-white w-8 h-8 flex items-center justify-center font-bold mr-4 shrink-0 font-display">
            {{ idx + 1 }}
          </span>
          <div class="space-y-1 flex-1">
            <div class="flex items-center gap-2">
              <span :class="cn(
                'text-xs font-bold uppercase tracking-widest px-3 py-1 border',
                q.type === 'choice' ? 'bg-black-50 text-black-600 border-black-200' :
                q.type === 'fill' ? 'bg-gold-50 text-gold-700 border-gold-200' :
                q.type === 'drawing' ? 'bg-black-700 text-white border-black-700' :
                'bg-black-50 text-black-600 border-black-200'
              )">
                {{ q.type === 'choice' ? '单选题' : q.type === 'fill' ? '填空题' : q.type === 'drawing' ? '绘图题' : '简答题' }}
              </span>
              <span class="text-xs text-gold-600 font-semibold uppercase tracking-wider">{{ q.score }} 分</span>
            </div>
            <p class="text-lg text-black-700 font-medium leading-relaxed mt-2">{{ q.content }}</p>
          </div>
        </div>

        <div v-if="q.image" class="mb-6 ml-12">
          <img :src="getImageUrl(q.image)" alt="题目图片" class="max-w-full h-auto border border-black-100" />
        </div>

        <!-- 单选题选项 -->
        <div v-if="q.type === 'choice'" class="grid grid-cols-1 gap-3">
          <button
            v-for="(opt, i) in q.options"
            :key="i"
            @click="answers[q.id] = opt"
            :class="cn(
              'flex items-center p-4 border-2 transition-all duration-200 text-left',
              answers[q.id] === opt 
                ? 'border-black-700 bg-black-700 text-white' 
                : 'border-black-100 hover:border-gold-300 text-black-600'
            )"
          >
            <div :class="cn(
              'w-5 h-5 border-2 mr-4 flex items-center justify-center shrink-0',
              answers[q.id] === opt ? 'border-white' : 'border-black-300'
            )">
              <div v-if="answers[q.id] === opt" class="w-2.5 h-2.5 bg-white" />
            </div>
            {{ opt }}
          </button>
        </div>

        <!-- 填空题 -->
        <div v-else-if="q.type === 'fill'">
          <input 
            type="text"
            v-model="answers[q.id]"
            class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all"
            placeholder="请输入答案..."
          />
        </div>

        <!-- 简答题 -->
        <div v-else-if="q.type === 'text'">
          <textarea 
            rows="5"
            v-model="answers[q.id]"
            class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 resize-none transition-all"
            placeholder="请输入详细回答..."
          />
        </div>

        <!-- 绘图题 -->
        <div v-else-if="q.type === 'drawing'">
          <AnswerSubmitter 
            :questionId="q.id"
            :questionType="q.type"
            :disabled="submittingQuestions.has(q.id)"
            @submit-answer="handleAnswerSubmit"
          />
        </div>
      </div>
    </div>
  </div>
  <div v-else class="flex items-center justify-center h-screen font-display text-black-600">加载中...</div>
</template>
