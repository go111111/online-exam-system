<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { Plus, BarChart, Edit, Trash2, X, Bell } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

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
  await api.post('/api/admin/notifications', newNotif.value);
  showNotification.value = false;
  newNotif.value = { title: '', content: '', type: 'announcement', target_role: 'all' };
  alert('通知已发布！');
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
    <div class="flex justify-between items-center mb-12">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">考试管理</h1>
        <p class="text-gray-500 mt-1">创建、编辑和监控所有考试</p>
      </div>
      <div class="flex space-x-4">
        <button 
          @click="showNotification = true"
          class="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all font-medium"
        >
          <Bell class="w-4 h-4 mr-2" />
          发布通知
        </button>
        <RouterLink to="/admin/results" class="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all font-medium">
          <BarChart class="w-4 h-4 mr-2" />
          查看成绩
        </RouterLink>
        <button 
          @click="showAdd = true"
          class="flex items-center bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus class="w-5 h-5 mr-2" />
          创建考试
        </button>
      </div>
    </div>

    <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-left">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">考试名称</th>
            <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">状态</th>
            <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">时间范围</th>
            <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="exam in exams" :key="exam.id" class="hover:bg-gray-50/50 transition-colors">
            <td class="px-8 py-6">
              <div class="font-bold text-gray-900">{{ exam.title }}</div>
              <div class="text-sm text-gray-400 mt-1">{{ exam.duration_minutes }} 分钟</div>
            </td>
            <td class="px-8 py-6">
              <button 
                @click="toggleStatus(exam)"
                :class="cn(
                  'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                  exam.status === 'open' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                )"
              >
                {{ exam.status === 'open' ? '开启中' : '已关闭' }}
              </button>
            </td>
            <td class="px-8 py-6">
              <div class="text-sm text-gray-600">{{ new Date(exam.start_time).toLocaleString() }}</div>
              <div class="text-sm text-gray-400">至 {{ new Date(exam.end_time).toLocaleString() }}</div>
            </td>
            <td class="px-8 py-6 text-right">
              <div class="flex justify-end space-x-2">
                <RouterLink :to="'/admin/exams/' + exam.id + '/questions'" class="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                  <Edit class="w-5 h-5" />
                </RouterLink>
                <button @click="deleteExam(exam.id)" class="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 class="w-5 h-5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showAdd" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-2xl font-bold text-gray-900">创建新考试</h2>
            <button @click="showAdd = false" class="p-2 text-gray-400 hover:text-gray-600">
              <X class="w-6 h-6" />
            </button>
          </div>
          <form @submit.prevent="handleAdd" class="grid grid-cols-2 gap-6">
            <div class="col-span-2">
              <label class="block text-sm font-bold text-gray-700 mb-2">考试标题</label>
              <input 
                type="text" 
                required
                v-model="newExam.title"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-bold text-gray-700 mb-2">描述</label>
              <textarea 
                v-model="newExam.description"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                rows="3"
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">开始时间</label>
              <input 
                type="datetime-local" 
                required
                v-model="newExam.start_time"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">结束时间</label>
              <input 
                type="datetime-local" 
                required
                v-model="newExam.end_time"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">时长 (分钟)</label>
              <input 
                type="number" 
                required
                v-model="newExam.duration_minutes"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div class="col-span-2 mt-4">
              <button type="submit" class="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                确认创建
              </button>
            </div>
          </form>
      </div>
    </div>

    <div v-if="showNotification" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-2xl font-bold text-gray-900">发布通知</h2>
            <button @click="showNotification = false" class="p-2 text-gray-400 hover:text-gray-600">
              <X class="w-6 h-6" />
            </button>
          </div>
          <form @submit.prevent="handlePublishNotification" class="space-y-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">通知标题</label>
              <input 
                type="text" 
                required
                v-model="newNotif.title"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="例：考试时间公告"
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">通知内容</label>
              <textarea 
                required
                v-model="newNotif.content"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                rows="4"
                placeholder="输入通知内容..."
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">通知类型</label>
              <select 
                v-model="newNotif.type"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="announcement">公告</option>
                <option value="exam">考试通知</option>
                <option value="system">系统通知</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">通知对象</label>
              <select 
                v-model="newNotif.target_role"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">所有人</option>
                <option value="student">学生</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <button type="submit" class="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all">
              发布通知
            </button>
          </form>
      </div>
    </div>
  </div>
</template>
