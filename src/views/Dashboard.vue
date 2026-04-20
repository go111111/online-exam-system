<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { FileText, Clock, Timer, ChevronRight } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
const exams = ref<any[]>([]);
const loading = ref(true);
const api = inject<any>('api');
const auth = inject<any>('auth');

onMounted(async () => {
  try {
    // 管理员重定向到后台管理
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
    <div class="mb-10">
      <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight">我的考试</h1>
      <p class="text-gray-500 mt-2 text-lg">查看并参加当前正在进行的考试</p>
    </div>

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div v-for="i in 3" :key="i" class="h-64 bg-gray-100 animate-pulse rounded-2xl" />
    </div>
    
    <div v-else-if="exams.length === 0" class="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
      <div class="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
        <FileText class="w-10 h-10 text-gray-300" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">暂无考试</h3>
      <p class="text-gray-500 mt-2">当前没有正在进行的考试，请稍后再来。</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div 
        v-for="exam in exams"
        :key="exam.id"
        class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-indigo-50/50 transition-all flex flex-col"
      >
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-indigo-50 rounded-xl">
            <FileText class="w-6 h-6 text-indigo-600" />
          </div>
          <span class="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full uppercase tracking-wider">
            进行中
          </span>
        </div>
        <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ exam.title }}</h3>
        <p class="text-gray-500 text-sm mb-6 flex-grow line-clamp-2">{{ exam.description }}</p>
        
        <div class="space-y-3 mb-8">
          <div class="flex items-center text-sm text-gray-600">
            <Clock class="w-4 h-4 mr-2 text-indigo-400" />
            <span>时长: {{ exam.duration }} 分钟</span>
          </div>
          <div class="flex items-center text-sm text-gray-600">
            <Timer class="w-4 h-4 mr-2 text-indigo-400" />
            <span>截止: {{ new Date(exam.endTime).toLocaleString() }}</span>
          </div>
        </div>

        <RouterLink 
          :to="'/exam/' + exam.id"
          class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-center hover:bg-indigo-700 transition-all flex items-center justify-center group"
        >
          开始考试
          <ChevronRight class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </RouterLink>
      </div>
    </div>
  </div>
</template>
