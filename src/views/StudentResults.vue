<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { Award, BarChart3, ChevronLeft, Clock, Table2, Trophy } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const api = inject<any>('api');
const results = ref<any[]>([]);
const loading = ref(true);

const gradedResults = computed(() => results.value.filter((item) => item.status === 'graded' && item.score !== null));
const latestResult = computed(() => gradedResults.value[0] || null);
const bestResult = computed(() => {
  if (!gradedResults.value.length) return null;
  return [...gradedResults.value].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
});
const averageScore = computed(() => {
  if (!gradedResults.value.length) return '-';
  const total = gradedResults.value.reduce((sum, item) => sum + Number(item.score || 0), 0);
  return (total / gradedResults.value.length).toFixed(1);
});

const fetchResults = async () => {
  loading.value = true;
  try {
    results.value = await api.get('/api/user/results');
  } finally {
    loading.value = false;
  }
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

const formatDuration = (minutes?: number) => {
  if (minutes === null || minutes === undefined) return '-';
  if (Number(minutes) <= 0) return '不足 1 分钟';
  return `${minutes} 分钟`;
};

const getStatusLabel = (status: string) => {
  if (status === 'graded') return '已批改';
  if (status === 'rejected') return '已打回';
  return '待批改';
};

onMounted(fetchResults);
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="mb-10">
      <RouterLink
        to="/"
        class="mb-5 inline-flex items-center justify-center w-9 h-9 border border-black-200 text-black-500 hover:border-gold-300 hover:text-gold-600 transition-colors"
        title="返回考试列表"
      >
        <ChevronLeft class="w-5 h-5" />
      </RouterLink>
      <div class="w-16 h-0.5 bg-gold-300 mb-6"></div>
      <h1 class="font-display text-4xl text-black-700 tracking-tight">我的成绩</h1>
      <p class="text-black-400 mt-2 text-lg">查看每次考试的成绩、排名和批改状态</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
      <div class="border border-black-100 bg-white p-6">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold text-black-400 uppercase tracking-widest">最近成绩</span>
          <Award class="w-5 h-5 text-gold-300" />
        </div>
        <div class="font-display text-3xl text-black-700">{{ latestResult?.score ?? '-' }}</div>
        <p class="text-sm text-black-400 mt-2">{{ latestResult?.examTitle || '暂无已批改考试' }}</p>
      </div>

      <div class="border border-black-100 bg-white p-6">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold text-black-400 uppercase tracking-widest">最高成绩</span>
          <Trophy class="w-5 h-5 text-gold-300" />
        </div>
        <div class="font-display text-3xl text-black-700">{{ bestResult?.score ?? '-' }}</div>
        <p class="text-sm text-black-400 mt-2">{{ bestResult?.examTitle || '暂无已批改考试' }}</p>
      </div>

      <div class="border border-black-100 bg-white p-6">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold text-black-400 uppercase tracking-widest">平均成绩</span>
          <BarChart3 class="w-5 h-5 text-gold-300" />
        </div>
        <div class="font-display text-3xl text-black-700">{{ averageScore }}</div>
        <p class="text-sm text-black-400 mt-2">基于已批改考试统计</p>
      </div>
    </div>

    <div class="bg-white border border-black-100 overflow-x-auto">
      <div class="px-6 py-5 border-b border-black-100 flex items-center gap-3">
        <Table2 class="w-5 h-5 text-gold-500" />
        <h2 class="font-display text-2xl text-black-700">成绩明细</h2>
      </div>
      <table class="w-full min-w-[860px] text-left">
        <thead class="bg-black-50 border-b border-black-100">
          <tr>
            <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">考试</th>
            <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">成绩</th>
            <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">排名</th>
            <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">状态</th>
            <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">答题时间</th>
            <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">提交时间</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-black-50">
          <tr v-if="loading">
            <td colspan="6" class="px-6 py-12 text-center text-black-400">加载中...</td>
          </tr>
          <tr v-else-if="results.length === 0">
            <td colspan="6" class="px-6 py-12 text-center text-black-400">暂无成绩记录</td>
          </tr>
          <tr v-for="row in results" v-else :key="row.id" class="hover:bg-gold-50/30 transition-colors">
            <td class="px-6 py-6 font-bold text-black-700">{{ row.examTitle }}</td>
            <td class="px-6 py-6 font-mono font-bold text-gold-600">{{ row.status === 'graded' ? row.score : '待批改' }}</td>
            <td class="px-6 py-6 text-black-600">
              <span v-if="row.rank">第 {{ row.rank }} 名 / {{ row.rankedCount }} 人</span>
              <span v-else>-</span>
            </td>
            <td class="px-6 py-6">
              <span
                :class="cn(
                  'inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider border',
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
            <td class="px-6 py-6 text-sm text-black-500">
              <span class="inline-flex items-center">
                <Clock class="w-4 h-4 mr-2 text-gold-300" />
                {{ formatDuration(row.usedTimeMinutes) }}
              </span>
            </td>
            <td class="px-6 py-6 text-sm text-black-400">{{ formatDate(row.submittedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
