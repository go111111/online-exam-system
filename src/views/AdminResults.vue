<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { ChevronRight, AlertTriangle, CheckCircle } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';

const results = ref<any[]>([]);
const api = inject<any>('api');

onMounted(async () => {
  results.value = await api.get('/api/admin/results');
});

const refreshResults = async () => {
  results.value = await api.get('/api/admin/results');
};

const rejectSubmission = async (row: any) => {
  const reason = prompt('请输入打回原因（可选）') || '管理员要求重新作答';
  await api.put(`/api/admin/submissions/${row.id}/reject`, { reason });
  await refreshResults();
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12">
    <div class="mb-12 flex items-center space-x-4">
      <RouterLink to="/admin" class="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
        <ChevronRight class="w-6 h-6 rotate-180" />
      </RouterLink>
      <h1 class="text-3xl font-bold text-gray-900">考试成绩</h1>
    </div>

    <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-left">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">考生</th>
            <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">考试</th>
            <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">得分</th>
            <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">状态</th>
            <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">提交时间</th>
            <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="res in results" :key="res.id" class="hover:bg-gray-50/50 transition-colors">
            <td class="px-8 py-6 font-bold text-gray-900">{{ res.username }}</td>
            <td class="px-8 py-6 text-gray-600">{{ res.examTitle }}</td>
            <td class="px-8 py-6 font-mono font-bold text-indigo-600">{{ res.score }}</td>
            <td class="px-8 py-6">
              <span v-if="res.status === 'rejected'" class="flex items-center text-amber-600 text-xs font-bold uppercase tracking-wider">
                已打回
              </span>
              <span v-else-if="res.cheated" class="flex items-center text-red-500 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle class="w-3 h-3 mr-1" />
                疑似作弊
              </span>
              <span v-else class="flex items-center text-green-500 text-xs font-bold uppercase tracking-wider">
                <CheckCircle class="w-3 h-3 mr-1" />
                正常
              </span>
            </td>
            <td class="px-8 py-6 text-sm text-gray-400">{{ new Date(res.endTime).toLocaleString() }}</td>
            <td class="px-8 py-6">
              <button
                v-if="res.status !== 'rejected'"
                @click="rejectSubmission(res)"
                class="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                打回重做
              </button>
              <span v-else class="text-xs text-gray-400">{{ res.rejectionReason || '无原因' }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
