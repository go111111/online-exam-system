<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { Award, BarChart3, ChevronLeft, Clock, Table2, Trophy } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    echarts?: any;
  }
}

const api = inject<any>('api');
const route = useRoute();
const router = useRouter();

const results = ref<any[]>([]);
const loading = ref(true);
const chartEl = ref<HTMLDivElement | null>(null);
const chartUnavailable = ref(false);
let chart: any = null;
let echartsLoader: Promise<void> | null = null;

const resultNav = [
  { label: '成绩概览', path: '/results', icon: BarChart3 },
  { label: '成绩明细', path: '/results/table', icon: Table2 }
];

const isDetailView = computed(() => route.path === '/results/table');

const gradedResults = computed(() => {
  return results.value.filter((item) => item.status === 'graded' && item.score !== null);
});

const latestResult = computed(() => {
  return gradedResults.value.length ? gradedResults.value[gradedResults.value.length - 1] : null;
});

const bestResult = computed(() => {
  if (!gradedResults.value.length) return null;
  return [...gradedResults.value].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
});

const averageScore = computed(() => {
  if (!gradedResults.value.length) return '-';
  const total = gradedResults.value.reduce((sum, item) => sum + Number(item.score || 0), 0);
  return (total / gradedResults.value.length).toFixed(1);
});

const resultNarrative = computed(() => {
  if (!gradedResults.value.length) {
    return '暂无已批改考试。完成考试并等待批改后，这里会自动生成成绩走势与排名摘要。';
  }

  const latest = latestResult.value;
  const best = bestResult.value;
  const rankText = latest?.rank ? `，本次排名第 ${latest.rank} 名` : '';
  return `最近一次已批改考试是「${latest?.examTitle}」，成绩 ${latest?.score}${rankText}。当前最高成绩来自「${best?.examTitle}」，平均成绩为 ${averageScore.value}。`;
});

const fetchResults = async () => {
  loading.value = true;
  try {
    results.value = await api.get('/api/user/results');
    await nextTick();
    if (!isDetailView.value) {
      await prepareChart();
      renderChart();
    }
  } finally {
    loading.value = false;
  }
};

const loadEcharts = () => {
  if (window.echarts) return Promise.resolve();
  if (echartsLoader) return echartsLoader;

  echartsLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('ECharts load failed'));
    document.head.appendChild(script);
  });

  return echartsLoader;
};

const prepareChart = async () => {
  try {
    await loadEcharts();
  } catch {
    chartUnavailable.value = true;
  }
};

const renderChart = () => {
  if (!chartEl.value) return;
  if (!window.echarts) {
    chartUnavailable.value = true;
    return;
  }

  chartUnavailable.value = false;
  chart?.dispose();
  chart = window.echarts.init(chartEl.value);

  const source = gradedResults.value;
  chart.setOption({
    color: ['#d4af37', '#111111'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#111111',
      borderColor: '#111111',
      textStyle: { color: '#ffffff' }
    },
    grid: {
      left: 48,
      right: 56,
      top: 48,
      bottom: 56
    },
    legend: {
      top: 8,
      textStyle: { color: '#333333' }
    },
    xAxis: {
      type: 'category',
      data: source.map((item) => item.examTitle),
      axisLabel: { color: '#666666', interval: 0 },
      axisLine: { lineStyle: { color: '#cccccc' } }
    },
    yAxis: [
      {
        type: 'value',
        name: '成绩',
        min: 0,
        axisLabel: { color: '#666666' },
        splitLine: { lineStyle: { color: '#e5e5e5' } }
      },
      {
        type: 'value',
        name: '排名',
        inverse: true,
        minInterval: 1,
        axisLabel: { color: '#666666' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '成绩',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        data: source.map((item) => Number(item.score || 0)),
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.12 }
      },
      {
        name: '排名',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 8,
        data: source.map((item) => item.rank || null),
        lineStyle: { width: 3 }
      }
    ]
  });
};

const handleResize = () => {
  chart?.resize();
};

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
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
  return '未批改';
};

onMounted(() => {
  fetchResults();
  window.addEventListener('resize', handleResize);
});

watch(() => route.path, async () => {
  await nextTick();
  if (!isDetailView.value && gradedResults.value.length > 0) {
    await prepareChart();
    renderChart();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  chart?.dispose();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="flex flex-col lg:flex-row gap-8">
      <aside class="w-full lg:w-64 shrink-0 border border-black-100 bg-white">
        <div class="p-6 border-b border-black-100">
          <div class="w-12 h-0.5 bg-gold-300 mb-4"></div>
          <h2 class="font-display text-xl text-black-700">我的成绩</h2>
        </div>

        <nav class="p-3 space-y-1">
          <RouterLink
            v-for="item in resultNav"
            :key="item.path"
            :to="item.path"
            :class="cn(
              'flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider border transition-all',
              route.path === item.path
                ? 'bg-black-700 text-white border-black-700'
                : 'bg-white text-black-500 border-transparent hover:border-gold-300 hover:text-gold-600'
            )"
          >
            <component :is="item.icon" class="w-4 h-4" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>
      </aside>

      <main class="flex-1 min-w-0">
        <div class="mb-10">
          <button
            @click="goBack"
            class="mb-5 inline-flex items-center justify-center w-9 h-9 border border-black-200 text-black-500 hover:border-gold-300 hover:text-gold-600 transition-colors"
            title="返回上一页"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>
          <div class="w-16 h-0.5 bg-gold-300 mb-6"></div>
          <h1 class="font-display text-4xl text-black-700 tracking-tight">
            {{ isDetailView ? '成绩明细' : '查看成绩' }}
          </h1>
          <p class="text-black-400 mt-2 text-lg">
            {{ isDetailView ? '查看每次考试的成绩、排名和批改状态' : '记录每次考试的成绩、排名和批改状态' }}
          </p>
        </div>

        <template v-if="!isDetailView">
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

          <div class="border border-black-100 bg-white p-6 mb-8">
            <div class="text-xs font-bold text-black-400 uppercase tracking-widest mb-3">成绩叙事</div>
            <p class="text-black-600 leading-relaxed">{{ resultNarrative }}</p>
          </div>

          <div class="border border-black-100 bg-white">
            <div class="px-6 py-5 border-b border-black-100 flex items-center justify-between">
              <div>
                <h2 class="font-display text-2xl text-black-700">成绩趋势</h2>
                <p class="text-sm text-black-400 mt-1">折线展示成绩变化和考试排名</p>
              </div>
            </div>
            <div v-if="gradedResults.length === 0" class="h-80 flex items-center justify-center text-black-400">
              暂无可视化数据
            </div>
            <div v-else ref="chartEl" class="h-80 w-full"></div>
            <div v-if="chartUnavailable" class="px-6 pb-5 text-sm text-gold-700">
              图表资源暂未加载，成绩明细仍可在明细页查看。
            </div>
          </div>
        </template>

        <div v-else class="bg-white border border-black-100 overflow-x-auto">
          <table class="w-full min-w-[900px] text-left">
            <thead class="bg-black-50 border-b border-black-100">
              <tr>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">考试</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">成绩</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">排名</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">状态</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">答题时间</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">提交时间</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">批改时间</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black-50">
              <tr v-if="loading">
                <td colspan="7" class="px-6 py-12 text-center text-black-400">加载中...</td>
              </tr>
              <tr v-else-if="results.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-black-400">暂无成绩记录</td>
              </tr>
              <template v-else>
                <tr v-for="row in [...results].reverse()" :key="row.id" class="hover:bg-gold-50/30 transition-colors">
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
                  <td class="px-6 py-6 text-sm text-black-400">{{ formatDate(row.scoredAt) }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  </div>
</template>
