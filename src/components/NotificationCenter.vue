<script lang="ts">
import { defineComponent, ref, onMounted, inject, computed } from 'vue';
import { Bell, X, CheckCircle, ChevronRight } from 'lucide-vue-next';

export default defineComponent({
  setup() {
    const api = inject<any>('api');
    const notifications = ref<any[]>([]);
    const unreadCount = ref(0);
    const showPanel = ref(false);

    const fetchNotifications = async () => {
      try {
        notifications.value = await api.get('/api/notifications');
        const countRes = await api.get('/api/notifications/unread/count');
        unreadCount.value = countRes.unread_count;
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    const markAsRead = async (id: number) => {
      try {
        await api.put(`/api/notifications/${id}/read`, {});
        fetchNotifications();
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    };

    const unreadNotifications = computed(() => notifications.value.filter(n => !n.is_read));

    onMounted(() => {
      fetchNotifications();
      // Refresh every 30 seconds
      setInterval(fetchNotifications, 30000);
    });

    return {
      notifications,
      unreadCount,
      showPanel,
      fetchNotifications,
      markAsRead,
      unreadNotifications
    };
  }
});
</script>

<template>
  <div class="relative">
    <!-- Notification Bell Button -->
    <button 
      @click="showPanel = !showPanel"
      class="relative p-2 text-gray-400 hover:text-indigo-600 transition-colors"
    >
      <Bell class="w-5 h-5" />
      <span 
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <!-- Notification Panel -->
    <div 
      v-if="showPanel"
      class="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-96 overflow-y-auto"
    >
      <div class="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center">
        <h3 class="font-bold text-gray-900">通知</h3>
        <button 
          @click="showPanel = false"
          class="p-1 text-gray-400 hover:text-gray-600"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div v-if="notifications.length === 0" class="p-8 text-center text-gray-400">
        <Bell class="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>暂无通知</p>
      </div>

      <div v-else class="divide-y divide-gray-50">
        <div 
          v-for="notif in notifications"
          :key="notif.id"
          :class="[
            'p-4 hover:bg-gray-50 transition-colors cursor-pointer',
            !notif.is_read ? 'bg-blue-50' : ''
          ]"
          @click="!notif.is_read && markAsRead(notif.id)"
        >
          <div class="flex items-start space-x-3">
            <div 
              :class="[
                'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                notif.is_read ? 'bg-gray-300' : 'bg-blue-500'
              ]"
            />
            <div class="flex-1 min-w-0">
              <h4 class="font-medium text-gray-900 text-sm">{{ notif.title }}</h4>
              <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ notif.content }}</p>
              <div class="flex items-center justify-between mt-2">
                <span class="text-xs text-gray-400">
                  {{ new Date(notif.created_at).toLocaleString('zh-CN', { 
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) }}
                </span>
                <span 
                  :class="[
                    'text-xs font-bold px-2 py-1 rounded-full',
                    notif.type === 'exam' ? 'bg-indigo-100 text-indigo-600' :
                    notif.type === 'announcement' ? 'bg-amber-100 text-amber-600' :
                    'bg-gray-100 text-gray-600'
                  ]"
                >
                  {{ notif.type === 'exam' ? '考试' : notif.type === 'announcement' ? '通知' : '系统' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
