<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { FileText, Clock, Timer, ChevronRight } from 'lucide-vue-next';
import { useRouter, RouterLink } from 'vue-router';

const router = useRouter();
const exams = ref<any[]>([]);
const loading = ref(true);
const api = inject<any>('api');
const auth = inject<any>('auth');

onMounted(async () => {
  try {
    if (auth.user.value?.role === 'admin') {
      router.push('/admin');
      return;
    }
    exams.value = await api.get('/api/exams');
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="mb-12">
      <div class="w-16 h-0.5 bg-gold-300 mb-6"></div>
      <h1 class="font-display text-4xl text-black-700 tracking-tight">我的考试</h1>
      <p class="text-black-400 mt-2 text-lg">查看并参加当前正在进行的考试</p>
    </div>

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div v-for="i in 3" :key="i" class="h-64 bg-black-50 animate-pulse" />
    </div>
    
    <div v-else-if="exams.length === 0" class="bg-white border border-black-100 p-16 text-center">
      <div class="bg-black-50 w-20 h-20 flex items-center justify-center mx-auto mb-6">
        <FileText class="w-10 h-10 text-black-300" />
      </div>
      <h3 class="font-display text-xl text-black-700">暂无考试</h3>
      <p class="text-black-400 mt-2">当前没有正在进行的考试，请稍后再来。</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div 
        v-for="exam in exams"
        :key="exam.id"
        class="bg-white border border-black-100 p-8 hover:border-gold-300 transition-all duration-300 flex flex-col"
      >
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-black-50">
            <FileText class="w-6 h-6 text-gold-300" />
          </div>
          <span
            :class="[
              'px-3 py-1 text-xs font-bold uppercase tracking-wider border',
              exam.submission_status === 'rejected'
                ? 'bg-gold-50 text-gold-700 border-gold-200'
                : exam.submission_status === 'graded'
                  ? 'bg-black-700 text-white border-black-700'
                  : exam.submission_status === 'submitted'
                    ? 'bg-white text-gold-700 border-gold-300'
                  : 'bg-black-700 text-white border-black-700'
            ]"
          >
            {{
              exam.submission_status === 'rejected'
                ? '已打回'
                : exam.submission_status === 'graded'
                  ? '已批改'
                  : exam.submission_status === 'submitted'
                    ? '未批改'
                    : '进行中'
            }}
          </span>
        </div>
        <h3 class="font-display text-2xl text-black-700 mb-2">{{ exam.title }}</h3>
        <p class="text-black-400 text-sm mb-6 flex-grow line-clamp-2">{{ exam.description }}</p>
        
        <div class="space-y-3 mb-8">
          <div class="flex items-center text-sm text-black-500">
            <Clock class="w-4 h-4 mr-2 text-gold-300" />
            <span>时长: {{ exam.duration ?? exam.duration_minutes }} 分钟</span>
          </div>
          <div class="flex items-center text-sm text-black-500">
            <Timer class="w-4 h-4 mr-2 text-gold-300" />
            <span>截止: {{ new Date(exam.endTime ?? exam.end_time).toLocaleString() }}</span>
          </div>
        </div>

        <RouterLink 
          v-if="!exam.submission_status || exam.submission_status === 'rejected'"
          :to="'/exam/' + exam.id"
          class="w-full bg-black-700 text-white py-3 font-bold text-center hover:bg-gold-300 hover:text-black-700 transition-all duration-300 flex items-center justify-center group uppercase tracking-wider text-sm"
        >
          {{ exam.submission_status === 'rejected' ? '重新作答' : '开始考试' }}
          <ChevronRight class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </RouterLink>
        <div
          v-else-if="exam.submission_status === 'graded'"
          class="w-full bg-black-700 text-white py-3 font-bold text-center uppercase tracking-wider text-sm"
        >
          已批改，成绩：{{ exam.total_score ?? 0 }}
        </div>
        <div
          v-else
          class="w-full bg-black-50 text-black-500 py-3 font-bold text-center uppercase tracking-wider text-sm"
        >
          已提交，等待批改
        </div>
      </div>
    </div>
  </div>
</template>
