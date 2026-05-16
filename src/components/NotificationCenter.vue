<script setup lang="ts">
import { ref, onMounted, inject, computed } from 'vue';
import { Bell, X } from 'lucide-vue-next';

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
  setInterval(fetchNotifications, 30000);
});
</script>

<template>
  <div class="relative">
    <button 
      @click="showPanel = !showPanel"
      class="relative p-2 text-black-400 hover:text-gold-300 transition-colors"
    >
      <Bell class="w-5 h-5" />
      <span 
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 bg-gold-300 text-black-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <div 
      v-if="showPanel"
      class="absolute right-0 mt-2 w-96 bg-white border border-black-100 z-50 max-h-96 overflow-y-auto shadow-lg"
    >
      <div class="sticky top-0 bg-white border-b border-black-100 p-4 flex justify-between items-center">
        <h3 class="font-display font-semibold text-black-700">通知</h3>
        <button 
          @click="showPanel = false"
          class="p-1 text-black-400 hover:text-black-700 transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div v-if="notifications.length === 0" class="p-8 text-center text-black-400">
        <Bell class="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>暂无通知</p>
      </div>

      <div v-else class="divide-y divide-black-50">
        <div 
          v-for="notif in notifications"
          :key="notif.id"
          :class="[
            'p-4 hover:bg-gold-50/30 transition-colors cursor-pointer',
            !notif.is_read ? 'bg-black-50' : ''
          ]"
          @click="!notif.is_read && markAsRead(notif.id)"
        >
          <div class="flex items-start space-x-3">
            <div 
              :class="[
                'w-2 h-2 mt-2 flex-shrink-0',
                notif.is_read ? 'bg-black-200' : 'bg-gold-300'
              ]"
            />
            <div class="flex-1 min-w-0">
              <h4 class="font-medium text-black-700 text-sm">{{ notif.title }}</h4>
              <p class="text-xs text-black-400 mt-1 line-clamp-2">{{ notif.content }}</p>
              <div class="flex items-center justify-between mt-2">
                <span class="text-xs text-black-300">
                  {{ new Date(notif.created_at).toLocaleString('zh-CN', { 
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) }}
                </span>
                <span 
                  :class="[
                    'text-xs font-bold px-2 py-1 border',
                    notif.type === 'exam' ? 'bg-black-700 text-white border-black-700' :
                    notif.type === 'announcement' ? 'bg-gold-50 text-gold-700 border-gold-200' :
                    'bg-black-50 text-black-600 border-black-200'
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
