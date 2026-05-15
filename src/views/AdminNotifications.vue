<script setup lang="ts">
import { inject, onMounted, ref } from 'vue';
import { Bell, RefreshCw, Trash2 } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import AdminSidebar from '@/components/AdminSidebar.vue';

const api = inject<any>('api');

const notifications = ref<any[]>([]);
const loading = ref(true);

const fetchNotifications = async () => {
  loading.value = true;
  try {
    notifications.value = await api.get('/api/admin/notifications');
  } catch (err: any) {
    ElMessage.error(err.message || '通知列表加载失败');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchNotifications);

const deleteNotification = async (id: number) => {
  if (!confirm('确定删除这条通知吗？')) return;

  try {
    await api.delete(`/api/admin/notifications/${id}`);
    ElMessage.success('通知已删除');
    await fetchNotifications();
  } catch (err: any) {
    ElMessage.error(err.message || '通知删除失败');
  }
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

const getTypeLabel = (type: string) => {
  if (type === 'exam') return '考试通知';
  if (type === 'system') return '系统通知';
  return '公告';
};

const getTargetLabel = (targetRole: string) => {
  if (targetRole === 'student') return '学生';
  if (targetRole === 'admin') return '管理员';
  return '所有人';
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12">
    <div class="flex flex-col lg:flex-row gap-8">
      <AdminSidebar />

      <main class="flex-1 min-w-0">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div class="w-16 h-0.5 bg-gold-300 mb-6"></div>
            <h1 class="font-display text-3xl text-black-700">通知处理</h1>
            <p class="text-black-400 mt-1">管理已发布通知，并查看接收与已读情况</p>
          </div>

          <button
            @click="fetchNotifications"
            class="inline-flex items-center px-4 py-2 bg-white border border-black-200 text-black-600 hover:border-gold-300 hover:text-gold-600 transition-all font-medium uppercase tracking-wider text-sm"
          >
            <RefreshCw class="w-4 h-4 mr-2" />
            刷新
          </button>
        </div>

        <div class="bg-white border border-black-100 overflow-x-auto">
          <table class="w-full min-w-[960px] text-left">
            <thead class="bg-black-50 border-b border-black-100">
              <tr>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">通知</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">类型</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">对象</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">已接收</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">已读</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">未读</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest">发布时间</th>
                <th class="px-6 py-5 text-xs font-bold text-black-500 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black-50">
              <tr v-if="loading">
                <td colspan="8" class="px-6 py-12 text-center text-black-400">加载中...</td>
              </tr>
              <tr v-else-if="notifications.length === 0">
                <td colspan="8" class="px-6 py-16 text-center">
                  <Bell class="w-10 h-10 text-black-300 mx-auto mb-4" />
                  <p class="text-black-400">暂无已发布通知</p>
                </td>
              </tr>
              <template v-else>
                <tr v-for="item in notifications" :key="item.id" class="hover:bg-gold-50/30 transition-colors">
                  <td class="px-6 py-6">
                    <div class="font-bold text-black-700">{{ item.title }}</div>
                    <p class="text-sm text-black-400 mt-1 line-clamp-2">{{ item.content }}</p>
                  </td>
                  <td class="px-6 py-6">
                    <span class="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider border bg-black-50 text-black-600 border-black-200">
                      {{ getTypeLabel(item.type) }}
                    </span>
                  </td>
                  <td class="px-6 py-6 text-black-600">{{ getTargetLabel(item.targetRole) }}</td>
                  <td class="px-6 py-6 font-mono font-bold text-black-700">{{ item.recipientCount }}</td>
                  <td class="px-6 py-6 font-mono font-bold text-gold-600">{{ item.readCount }}</td>
                  <td class="px-6 py-6 font-mono text-black-500">{{ item.unreadCount }}</td>
                  <td class="px-6 py-6 text-sm text-black-400">{{ formatDate(item.createdAt) }}</td>
                  <td class="px-6 py-6 text-right">
                    <button
                      @click="deleteNotification(item.id)"
                      class="p-2 text-black-400 hover:text-red-600 transition-colors"
                      title="删除通知"
                    >
                      <Trash2 class="w-5 h-5" />
                    </button>
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
