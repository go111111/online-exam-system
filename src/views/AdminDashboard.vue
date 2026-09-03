<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { Plus, Edit, Trash2, X, Bell, Activity, AlertTriangle, BarChart3, FileCheck2, Users } from 'lucide-vue-next';
import { cn } from '@/lib/utils';
import { RouterLink } from 'vue-router';
import AdminSidebar from '@/components/AdminSidebar.vue';
import { ElMessage } from 'element-plus';
import type { AdminAnalyticsOverview } from '@/types/adminAnalytics';

const exams = ref<any[]>([]);
const analytics = ref<AdminAnalyticsOverview | null>(null);
const analyticsLoading = ref(false);
const showAdd = ref(false);
const showNotification = ref(false);
const newExam = ref({ title: '', description: '', start_time: '', end_time: '', duration_minutes: 60, total_score: 100, status: 'closed' });
const newNotif = ref({ title: '', content: '', type: 'announcement', target_role: 'all' });
const api = inject<any>('api');

const fetchExams = async () => {
  exams.value = await api.get('/api/admin/exams');
};

const fetchAnalytics = async () => {
  analyticsLoading.value = true;
  try {
    analytics.value = await api.get('/api/admin/analytics/overview');
  } finally {
    analyticsLoading.value = false;
  }
};

const refreshDashboard = async () => {
  await Promise.all([fetchExams(), fetchAnalytics()]);
};

onMounted(refreshDashboard);

const handleAdd = async () => {
  await api.post('/api/admin/exams', newExam.value);
  showAdd.value = false;
  newExam.value = { title: '', description: '', start_time: '', end_time: '', duration_minutes: 60, total_score: 100, status: 'closed' };
  await refreshDashboard();
};

const handlePublishNotification = async () => {
  console.log('=== 开始发布通知 ===');
  console.log('通知数据:', newNotif.value);
  try {
    console.log('正在发送请求到 /api/admin/notifications...');
    const result = await api.post('/api/admin/notifications', newNotif.value);
    console.log('通知发布成功:', result);
    showNotification.value = false;
    newNotif.value = { title: '', content: '', type: 'announcement', target_role: 'all' };
    ElMessage.success(`通知发布成功，预计 ${result.recipientCount ?? 0} 人可收到。`);
  } catch (err: any) {
    console.error('=== 通知发布失败 ===');
    console.error('错误对象:', err);
    console.error('错误消息:', err.message);
    console.error('错误响应:', err.response);
    ElMessage.error(err.message || '通知发布失败，请检查接口服务。');
  }
};

const openNotificationModal = () => {
  console.log('发布通知按钮被点击');
  showNotification.value = true;
  console.log('showNotification:', showNotification.value);
};

const toggleStatus = async (exam: any) => {
  const newStatus = exam.status === 'open' ? 'closed' : 'open';
  await api.put(`/api/admin/exams/${exam.id}`, { ...exam, status: newStatus });
  await refreshDashboard();
};

const deleteExam = async (id: number) => {
  if (confirm('确定删除吗？')) {
    await api.delete(`/api/admin/exams/${id}`);
    await refreshDashboard();
  }
};

const formatPercent = (value?: number) => `${Number(value || 0).toFixed(1)}%`;

const getStatusLabel = (status: string) => {
  if (status === 'graded') return '已批改';
  if (status === 'rejected') return '已打回';
  if (status === 'submitted') return '待批改';
  return status === 'open' ? '开启中' : '已关闭';
};

const formatScore = (score: number | null, maxScore: number) => {
  if (score === null || score === undefined) return '待批改';
  return maxScore > 0 ? `${score}/${maxScore}` : `${score}`;
};
</script>

<template>
  <div class="admin-shell max-w-7xl mx-auto px-4 py-12">
    <div class="admin-layout flex flex-col lg:flex-row gap-8">
      <AdminSidebar />

      <main class="admin-main flex-1 min-w-0">
    <div class="flex justify-between items-center mb-12">
      <div>
        <div class="w-16 h-0.5 bg-gold-300 mb-6"></div>
        <h1 class="font-display text-3xl text-black-700">考试管理</h1>
        <p class="text-black-400 mt-1">创建、编辑和监控所有考试</p>
      </div>
      <div class="flex space-x-4">
        <button 
          @click="openNotificationModal"
          class="flex items-center px-4 py-2 bg-white border border-black-200 text-black-600 hover:border-gold-300 hover:text-gold-600 transition-all font-medium uppercase tracking-wider text-sm"
        >
          <Bell class="w-4 h-4 mr-2" />
          发布通知
        </button>
        <button 
          @click="showAdd = true"
          class="flex items-center bg-black-700 text-white px-6 py-2 font-bold hover:bg-gold-300 hover:text-black-700 transition-all duration-300 uppercase tracking-wider text-sm"
        >
          <Plus class="w-5 h-5 mr-2" />
          创建考试
        </button>
      </div>
    </div>

    <section class="mb-10">
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div class="bg-white border border-black-100 p-5">
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-bold text-black-400 uppercase tracking-widest">考试总数</span>
            <FileCheck2 class="w-5 h-5 text-gold-500" />
          </div>
          <div class="font-display text-3xl text-black-700">{{ analytics?.totals.exams ?? 0 }}</div>
          <p class="text-sm text-black-400 mt-2">当前已创建考试</p>
        </div>
        <div class="bg-white border border-black-100 p-5">
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-bold text-black-400 uppercase tracking-widest">学生人数</span>
            <Users class="w-5 h-5 text-gold-500" />
          </div>
          <div class="font-display text-3xl text-black-700">{{ analytics?.totals.students ?? 0 }}</div>
          <p class="text-sm text-black-400 mt-2">可参加考试账号</p>
        </div>
        <div class="bg-white border border-black-100 p-5">
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-bold text-black-400 uppercase tracking-widest">提交试卷</span>
            <BarChart3 class="w-5 h-5 text-gold-500" />
          </div>
          <div class="font-display text-3xl text-black-700">{{ analytics?.totals.submissions ?? 0 }}</div>
          <p class="text-sm text-black-400 mt-2">待批改 {{ analytics?.totals.pendingManual ?? 0 }} 份</p>
        </div>
        <div class="bg-white border border-black-100 p-5">
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-bold text-black-400 uppercase tracking-widest">平均得分率</span>
            <Activity class="w-5 h-5 text-gold-500" />
          </div>
          <div class="font-display text-3xl text-black-700">{{ formatPercent(analytics?.totals.averageScoreRate) }}</div>
          <p class="text-sm text-black-400 mt-2">通过率 {{ formatPercent(analytics?.totals.passRate) }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 mt-6">
        <div class="bg-white border border-black-100 overflow-hidden">
          <div class="px-6 py-5 border-b border-black-100 flex items-center justify-between">
            <div>
              <h2 class="font-display text-xl text-black-700">考试表现分析</h2>
              <p class="text-sm text-black-400 mt-1">按提交量和得分率汇总最近考试</p>
            </div>
            <span v-if="analyticsLoading" class="text-xs text-black-400 uppercase tracking-widest">刷新中</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[640px] text-left">
              <thead class="bg-black-50 border-b border-black-100">
                <tr>
                  <th class="px-6 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">考试</th>
                  <th class="px-6 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">题量</th>
                  <th class="px-6 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">提交</th>
                  <th class="px-6 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">平均得分率</th>
                  <th class="px-6 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">通过率</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-black-50">
                <tr v-if="!analytics?.examPerformance.length">
                  <td colspan="5" class="px-6 py-10 text-center text-black-400">暂无统计数据</td>
                </tr>
                <tr v-for="item in analytics?.examPerformance" :key="item.examId" class="hover:bg-gold-50/30 transition-colors">
                  <td class="px-6 py-5">
                    <div class="font-bold text-black-700">{{ item.title }}</div>
                    <div class="text-xs text-black-400 mt-1">{{ getStatusLabel(item.status) }} · 满分 {{ item.maxScore }}</div>
                  </td>
                  <td class="px-6 py-5 font-mono text-black-600">{{ item.questionCount }}</td>
                  <td class="px-6 py-5 font-mono text-black-600">{{ item.submittedCount }}</td>
                  <td class="px-6 py-5 font-mono font-bold text-gold-600">{{ formatPercent(item.averageScoreRate) }}</td>
                  <td class="px-6 py-5 font-mono text-black-600">{{ formatPercent(item.passRate) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-white border border-black-100 overflow-hidden">
          <div class="px-6 py-5 border-b border-black-100">
            <h2 class="font-display text-xl text-black-700">近期提交</h2>
            <p class="text-sm text-black-400 mt-1">快速发现待批改与异常试卷</p>
          </div>
          <div class="divide-y divide-black-50">
            <div v-if="!analytics?.latestSubmissions.length" class="px-6 py-10 text-center text-black-400">暂无提交记录</div>
            <div v-for="item in analytics?.latestSubmissions" :key="item.id" class="px-6 py-5">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="font-bold text-black-700 truncate">{{ item.username }}</div>
                  <div class="text-sm text-black-400 truncate">{{ item.examTitle }}</div>
                </div>
                <span
                  :class="cn(
                    'shrink-0 px-3 py-1 text-xs font-bold uppercase tracking-wider border',
                    item.status === 'graded'
                      ? 'bg-black-700 text-white border-black-700'
                      : item.status === 'rejected'
                        ? 'bg-gold-50 text-gold-700 border-gold-200'
                        : 'bg-white text-gold-700 border-gold-300'
                  )"
                >
                  {{ getStatusLabel(item.status) }}
                </span>
              </div>
              <div class="mt-3 flex items-center justify-between text-sm text-black-500">
                <span class="font-mono">{{ formatScore(item.totalScore, item.maxScore) }}</span>
                <span>{{ new Date(item.submittedAt).toLocaleString() }}</span>
              </div>
              <div v-if="item.cheated" class="mt-3 inline-flex items-center text-xs font-bold text-gold-700 uppercase tracking-wider">
                <AlertTriangle class="w-3 h-3 mr-1" />
                疑似异常
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="bg-white border border-black-100 overflow-hidden">
      <table class="w-full text-left">
        <thead class="bg-black-50 border-b border-black-100">
          <tr>
            <th class="px-8 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">考试名称</th>
            <th class="px-8 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">状态</th>
            <th class="px-8 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">时间范围</th>
            <th class="px-8 py-5 text-xs font-bold text-black-500 uppercase tracking-widest text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-black-50">
          <tr v-for="exam in exams" :key="exam.id" class="hover:bg-gold-50/30 transition-colors">
            <td class="px-8 py-6">
              <div class="font-bold text-black-700 font-display">{{ exam.title }}</div>
              <div class="text-sm text-black-400 mt-1">{{ exam.duration_minutes }} 分钟</div>
            </td>
            <td class="px-8 py-6">
              <button 
                @click="toggleStatus(exam)"
                :class="cn(
                  'px-3 py-1 text-xs font-bold uppercase tracking-wider border',
                  exam.status === 'open' ? 'bg-black-700 text-white border-black-700' : 'bg-black-50 text-black-500 border-black-200'
                )"
              >
                {{ exam.status === 'open' ? '开启中' : '已关闭' }}
              </button>
            </td>
            <td class="px-8 py-6">
              <div class="text-sm text-black-600">{{ new Date(exam.start_time).toLocaleString() }}</div>
              <div class="text-sm text-black-400">至 {{ new Date(exam.end_time).toLocaleString() }}</div>
            </td>
            <td class="px-8 py-6 text-right">
              <div class="flex justify-end space-x-2">
                <RouterLink :to="'/admin/exams/' + exam.id + '/questions'" class="p-2 text-black-400 hover:text-gold-600 transition-colors">
                  <Edit class="w-5 h-5" />
                </RouterLink>
                <button @click="deleteExam(exam.id)" class="p-2 text-black-400 hover:text-red-600 transition-colors">
                  <Trash2 class="w-5 h-5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 创建考试模态框 -->
    <div v-if="showAdd" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div v-dialog-drag="'[data-dialog-drag-handle]'" class="bg-white w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-hidden">
        <div data-dialog-drag-handle class="flex justify-between items-center p-8 border-b border-black-100 cursor-grab active:cursor-grabbing select-none">
            <h2 class="font-display text-2xl text-black-700">创建新考试</h2>
            <button @click="showAdd = false" class="p-2 text-black-400 hover:text-black-700 transition-colors">
              <X class="w-6 h-6" />
            </button>
          </div>
          <form @submit.prevent="handleAdd" class="p-8 grid grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto detail-scrollbar">
            <div class="col-span-2">
              <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">考试标题</label>
              <input 
                type="text" 
                required
                v-model="newExam.title"
                class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">描述</label>
              <textarea 
                v-model="newExam.description"
                class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 resize-none transition-all"
                rows="3"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">开始时间</label>
              <input 
                type="datetime-local" 
                required
                v-model="newExam.start_time"
                class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">结束时间</label>
              <input 
                type="datetime-local" 
                required
                v-model="newExam.end_time"
                class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">时长 (分钟)</label>
              <input 
                type="number" 
                required
                v-model="newExam.duration_minutes"
                class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all"
              />
            </div>
            <div class="col-span-2 mt-4">
              <button type="submit" class="w-full bg-black-700 text-white py-4 font-bold hover:bg-gold-300 hover:text-black-700 transition-all duration-300 uppercase tracking-wider">
                确认创建
              </button>
            </div>
          </form>
      </div>
    </div>

    <!-- 发布通知模态框 -->
    <div v-if="showNotification" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div v-dialog-drag="'[data-dialog-drag-handle]'" class="bg-white w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-hidden">
        <div data-dialog-drag-handle class="flex justify-between items-center p-8 border-b border-black-100 cursor-grab active:cursor-grabbing select-none">
            <h2 class="font-display text-2xl text-black-700">发布通知</h2>
            <button @click="showNotification = false" class="p-2 text-black-400 hover:text-black-700 transition-colors">
              <X class="w-6 h-6" />
            </button>
          </div>
          <form @submit.prevent="handlePublishNotification" class="p-8 space-y-6 max-h-[70vh] overflow-y-auto detail-scrollbar">
            <div>
              <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">通知标题</label>
              <input 
                type="text" 
                required
                v-model="newNotif.title"
                class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all"
                placeholder="例：考试时间公告"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">通知内容</label>
              <textarea 
                required
                v-model="newNotif.content"
                class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 resize-none transition-all"
                rows="4"
                placeholder="输入通知内容..."
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">通知类型</label>
              <select 
                v-model="newNotif.type"
                class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all"
              >
                <option value="announcement">公告</option>
                <option value="exam">考试通知</option>
                <option value="system">系统通知</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">通知对象</label>
              <select 
                v-model="newNotif.target_role"
                class="w-full px-4 py-3 border border-black-200 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all"
              >
                <option value="all">所有人</option>
                <option value="student">学生</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <button type="submit" class="w-full bg-black-700 text-white py-4 font-bold hover:bg-gold-300 hover:text-black-700 transition-all duration-300 uppercase tracking-wider">
              发布通知
            </button>
          </form>
      </div>
    </div>
      </main>
    </div>
  </div>
</template>
