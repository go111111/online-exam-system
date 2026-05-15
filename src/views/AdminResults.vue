<script setup lang="ts">
import { inject, onMounted, ref } from 'vue';
import { AlertTriangle, CheckCircle } from 'lucide-vue-next';
import { cn } from '@/lib/utils';
import AdminSidebar from '@/components/AdminSidebar.vue';

const results = ref<any[]>([]);
const api = inject<any>('api');

const refreshResults = async () => {
  results.value = await api.get('/api/admin/results');
};

onMounted(refreshResults);

const rejectSubmission = async (row: any) => {
  const reason = prompt('请输入打回原因（可选）') || '管理员要求重新作答';
  await api.put(`/api/admin/submissions/${row.id}/reject`, { reason });
  await refreshResults();
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

const getStatusLabel = (status: string) => {
  if (status === 'graded') return '已批改';
  if (status === 'rejected') return '已打回';
  return '未批改';
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12">
    <div class="flex flex-col lg:flex-row gap-8">
      <AdminSidebar />

      <main class="flex-1 min-w-0">
        <div class="mb-12">
          <div class="w-16 h-0.5 bg-gold-300 mb-6"></div>
          <h1 class="font-display text-3xl text-black-700">考试成绩</h1>
          <p class="text-black-400 mt-1">查看所有考试提交记录与最终成绩</p>
        </div>

        <div class="bg-white border border-black-100 overflow-x-auto">
          <table class="w-full min-w-[900px] text-left">
            <thead class="bg-black-50 border-b border-black-100">
              <tr>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">用户 ID</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">考生</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">考试</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">得分</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">批改状态</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">异常</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">提交时间</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black-50">
              <tr v-if="results.length === 0">
                <td colspan="8" class="px-6 py-12 text-center text-black-400">暂无成绩记录</td>
              </tr>
              <template v-else>
                <tr v-for="res in results" :key="res.id" class="hover:bg-gold-50/30 transition-colors">
                  <td class="px-6 py-6 font-mono text-black-600">#{{ res.userId }}</td>
                  <td class="px-6 py-6">
                    <div class="font-bold text-black-700">{{ res.username }}</div>
                    <div class="text-xs text-black-400">{{ res.email }}</div>
                  </td>
                  <td class="px-6 py-6 text-black-600">{{ res.examTitle }}</td>
                  <td class="px-6 py-6 font-mono font-bold text-gold-600">{{ res.status === 'submitted' ? '待批改' : (res.score ?? 0) }}</td>
                  <td class="px-6 py-6">
                    <span
                      :class="cn(
                        'inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider border',
                        res.status === 'graded'
                          ? 'bg-black-700 text-white border-black-700'
                          : res.status === 'rejected'
                            ? 'bg-gold-50 text-gold-700 border-gold-200'
                            : 'bg-white text-gold-700 border-gold-300'
                      )"
                    >
                      {{ getStatusLabel(res.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-6">
                    <span v-if="res.cheated" class="inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-wider border bg-gold-50 text-gold-700 border-gold-200">
                      <AlertTriangle class="w-3 h-3 mr-1" />
                      疑似作弊
                    </span>
                    <span v-else class="inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-wider border bg-black-50 text-black-600 border-black-200">
                      <CheckCircle class="w-3 h-3 mr-1" />
                      正常
                    </span>
                  </td>
                  <td class="px-6 py-6 text-sm text-black-400">{{ formatDate(res.submittedAt) }}</td>
                  <td class="px-6 py-6">
                    <button
                      v-if="res.status !== 'rejected'"
                      @click="rejectSubmission(res)"
                      class="px-3 py-1 text-xs font-bold uppercase tracking-wider border border-black-200 text-black-600 hover:border-gold-300 hover:text-gold-600 transition-colors"
                    >
                      打回重做
                    </button>
                    <span v-else class="text-xs text-black-400">{{ res.rejectionReason || '无原因' }}</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  </div>
</template>
