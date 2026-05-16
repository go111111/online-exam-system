<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { Plus, Edit, Trash2, X, Bell } from 'lucide-vue-next';
import { cn } from '@/lib/utils';
import { RouterLink } from 'vue-router';
import AdminSidebar from '@/components/AdminSidebar.vue';
import { ElMessage } from 'element-plus';

const exams = ref<any[]>([]);
const showAdd = ref(false);
const showNotification = ref(false);
const newExam = ref({ title: '', description: '', start_time: '', end_time: '', duration_minutes: 60, total_score: 100, status: 'closed' });
const newNotif = ref({ title: '', content: '', type: 'announcement', target_role: 'all' });
const api = inject<any>('api');

const fetchExams = async () => {
  exams.value = await api.get('/api/admin/exams');
};

onMounted(fetchExams);

const handleAdd = async () => {
  await api.post('/api/admin/exams', newExam.value);
  showAdd.value = false;
  newExam.value = { title: '', description: '', start_time: '', end_time: '', duration_minutes: 60, total_score: 100, status: 'closed' };
  fetchExams();
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
  fetchExams();
};

const deleteExam = async (id: number) => {
  if (confirm('确定删除吗？')) {
    await api.delete(`/api/admin/exams/${id}`);
    fetchExams();
  }
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12">
    <div class="flex flex-col lg:flex-row gap-8">
      <AdminSidebar />

      <main class="flex-1 min-w-0">
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
      <div class="bg-white w-full max-w-2xl shadow-2xl">
        <div class="flex justify-between items-center p-8 border-b border-black-100">
            <h2 class="font-display text-2xl text-black-700">创建新考试</h2>
            <button @click="showAdd = false" class="p-2 text-black-400 hover:text-black-700 transition-colors">
              <X class="w-6 h-6" />
            </button>
          </div>
          <form @submit.prevent="handleAdd" class="p-8 grid grid-cols-2 gap-6">
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
      <div class="bg-white w-full max-w-2xl shadow-2xl">
        <div class="flex justify-between items-center p-8 border-b border-black-100">
            <h2 class="font-display text-2xl text-black-700">发布通知</h2>
            <button @click="showNotification = false" class="p-2 text-black-400 hover:text-black-700 transition-colors">
              <X class="w-6 h-6" />
            </button>
          </div>
          <form @submit.prevent="handlePublishNotification" class="p-8 space-y-6">
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
