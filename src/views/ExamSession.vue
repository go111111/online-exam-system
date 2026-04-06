<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Timer } from 'lucide-vue-next';
import { cn } from '@/src/lib/utils';

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

onMounted(async () => {
  try {
    const data = await api.get(`/api/exams/${id}`);
    examData.value = data;
    timeLeft.value = data.exam.duration * 60;
  } catch (err: any) {
    alert(err.message);
    router.push('/');
  }
});

// Timer
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

// Anti-cheat
const handleBlur = () => {
  cheated.value = true;
  alert('警告：检测到您离开了考试页面。此行为已被记录。');
};

const handleContextMenu = (e: any) => e.preventDefault();
const handleCopy = (e: any) => e.preventDefault();

onMounted(() => {
  window.addEventListener('blur', handleBlur);
  window.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('copy', handleCopy);
});

onUnmounted(() => {
  window.removeEventListener('blur', handleBlur);
  window.removeEventListener('contextmenu', handleContextMenu);
  window.removeEventListener('copy', handleCopy);
});

const handleSubmit = async () => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    await api.post(`/api/exams/${id}/submit`, { 
      answers: answers.value, 
      cheated: cheated.value, 
      startTime: startTime.value 
    });
    alert('考试已提交！');
    router.push('/');
  } catch (err: any) {
    alert('提交失败: ' + err.message);
    isSubmitting.value = false;
  }
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};
</script>

<template>
  <div v-if="examData" class="min-h-screen bg-gray-50 pb-20">
    <div class="bg-white border-b sticky top-0 z-40 shadow-sm">
      <div class="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
        <div class="flex items-center space-x-4">
          <h2 class="text-xl font-bold text-gray-900">{{ examData.exam.title }}</h2>
          <div :class="cn(
            'flex items-center px-3 py-1 rounded-full text-sm font-bold',
            timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-indigo-50 text-indigo-600'
          )">
            <Timer class="w-4 h-4 mr-2" />
            {{ formatTime(timeLeft) }}
          </div>
        </div>
        <button 
          @click="() => { if(confirm('确定要提交吗？')) handleSubmit() }"
          class="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
        >
          提交试卷
        </button>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 mt-8 space-y-8">
      <div v-for="(q, idx) in examData.questions" :key="q.id" class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div class="flex items-start mb-6">
          <span class="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold mr-4 shrink-0">
            {{ idx + 1 }}
          </span>
          <div class="space-y-1">
            <span class="text-xs font-bold text-indigo-500 uppercase tracking-widest">
              {{ q.type === 'choice' ? '单选题' : q.type === 'fill' ? '填空题' : '简答题' }}
            </span>
            <p class="text-lg text-gray-900 font-medium leading-relaxed">{{ q.content }}</p>
          </div>
        </div>

        <div v-if="q.type === 'choice'" class="grid grid-cols-1 gap-3">
          <button
            v-for="(opt, i) in q.options"
            :key="i"
            @click="answers[q.id] = opt"
            :class="cn(
              'flex items-center p-4 rounded-xl border-2 transition-all text-left',
              answers[q.id] === opt 
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                : 'border-gray-100 hover:border-gray-200 text-gray-600'
            )"
          >
            <div :class="cn(
              'w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center',
              answers[q.id] === opt ? 'border-indigo-600' : 'border-gray-300'
            )">
              <div v-if="answers[q.id] === opt" class="w-2.5 h-2.5 bg-indigo-600 rounded-full" />
            </div>
            {{ opt }}
          </button>
        </div>

        <input 
          v-else-if="q.type === 'fill'"
          type="text"
          v-model="answers[q.id]"
          class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="请输入答案..."
        />

        <textarea 
          v-else-if="q.type === 'text'"
          rows="5"
          v-model="answers[q.id]"
          class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
          placeholder="请输入详细回答..."
        />
      </div>
    </div>
  </div>
  <div v-else class="flex items-center justify-center h-screen">加载中...</div>
</template>
