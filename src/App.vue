<script setup lang="ts">
import { inject } from 'vue';
import { RouterView, RouterLink, useRouter } from 'vue-router';
import { 
  LogOut, 
  User, 
  Shield, 
  BarChart3
} from 'lucide-vue-next';
import NotificationCenter from './components/NotificationCenter.vue';

const auth = inject<any>('auth');
const user = auth.user;
const router = useRouter();

const handleLogout = () => {
  auth.logout();
  setTimeout(() => {
    router.push('/login');
  }, 100);
};
</script>

<template>
  <div class="min-h-screen bg-white font-sans text-black-700 selection:bg-gold-100 selection:text-black-700">
    <nav v-if="$route.path !== '/login' && $route.path !== '/register'" class="bg-white border-b border-black-100 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-black-700 flex items-center justify-center">
              <Shield class="w-5 h-5 text-gold-300" />
            </div>
            <RouterLink to="/" class="font-display text-xl font-bold text-black-700 tracking-tight">
              在线考试系统
            </RouterLink>
          </div>
          <div class="flex items-center space-x-4">
            <template v-if="user">
              <RouterLink
                v-if="user.role !== 'admin'"
                to="/results"
                class="flex items-center px-4 py-2 bg-white border border-black-200 text-black-600 hover:border-gold-300 hover:text-gold-600 transition-all font-medium uppercase tracking-wider text-sm"
              >
                <BarChart3 class="w-4 h-4 mr-2" />
                查看成绩
              </RouterLink>
              <NotificationCenter />
              <div class="w-9 h-9 bg-black-50 border border-black-100 flex items-center justify-center" title="用户">
                <User class="w-4 h-4 text-black-500" />
              </div>
              <button 
                @click="handleLogout"
                class="p-2 text-black-400 hover:text-gold-600 transition-colors"
              >
                <LogOut class="w-5 h-5" />
              </button>
            </template>
            <RouterLink v-else to="/login" class="bg-black-700 text-white px-6 py-2 hover:bg-gold-300 hover:text-black-700 transition-all duration-300 font-medium uppercase tracking-wider text-sm">
              登录
            </RouterLink>
          </div>
        </div>
      </div>
    </nav>

    <RouterView />
  </div>
</template>

<style>
@import "tailwindcss";

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
