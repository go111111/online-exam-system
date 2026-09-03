<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { RouterView, RouterLink, useRouter } from 'vue-router';
import { 
  LogOut, 
  User, 
  Shield, 
  BarChart3,
  Moon,
  Sun
} from 'lucide-vue-next';
import NotificationCenter from './components/NotificationCenter.vue';

const auth = inject<any>('auth');
const user = auth.user;
const router = useRouter();
const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('ui-theme') : null;
const theme = ref(savedTheme === 'light' ? 'light' : 'dark');
const isLightTheme = computed(() => theme.value === 'light');

const applyTheme = (value: 'dark' | 'light') => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = value;
  localStorage.setItem('ui-theme', value);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ui-theme-change', { detail: value }));
  }
};

applyTheme(theme.value);

const toggleTheme = () => {
  theme.value = isLightTheme.value ? 'dark' : 'light';
  applyTheme(theme.value);
};

const handleLogout = () => {
  auth.logout();
  setTimeout(() => {
    router.push('/login');
  }, 100);
};
</script>

<template>
  <div class="min-h-screen font-sans text-gold-50 selection:bg-gold-300 selection:text-black-700">
    <nav v-if="$route.path !== '/login' && $route.path !== '/register'" class="sticky top-0 z-50 border-b border-gold-300/20 bg-black-700/90 backdrop-blur-xl">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gold-300 flex items-center justify-center shadow-[0_0_24px_rgba(212,175,55,0.25)]">
              <Shield class="w-5 h-5 text-gold-300" />
            </div>
            <RouterLink to="/" class="font-display text-xl font-bold text-gold-50 tracking-tight">
              在线考试系统
            </RouterLink>
          </div>
          <div class="flex items-center space-x-4">
            <template v-if="user">
              <button
                type="button"
                class="theme-toggle"
                :class="{ 'is-light': isLightTheme }"
                :aria-pressed="isLightTheme"
                :title="isLightTheme ? '切换到黑色主题' : '切换到白色主题'"
                @click="toggleTheme"
              >
                <span class="theme-toggle__track">
                  <span class="theme-toggle__thumb">
                    <Sun class="theme-toggle__icon theme-toggle__icon--sun" />
                    <Moon class="theme-toggle__icon theme-toggle__icon--moon" />
                  </span>
                </span>
              </button>
              <RouterLink
                v-if="user.role !== 'admin'"
                to="/results"
                class="flex items-center px-4 py-2 border border-gold-300/25 text-gold-100 hover:border-gold-300 hover:text-gold-300 hover:bg-gold-300/10 transition-all font-medium uppercase tracking-wider text-sm"
              >
                <BarChart3 class="w-4 h-4 mr-2" />
                查看成绩
              </RouterLink>
              <NotificationCenter />
              <div class="w-9 h-9 bg-black-800 border border-gold-300/20 flex items-center justify-center" title="用户">
                <User class="w-4 h-4 text-gold-200" />
              </div>
              <button 
                @click="handleLogout"
                class="p-2 text-gold-200 hover:text-gold-300 transition-colors"
              >
                <LogOut class="w-5 h-5" />
              </button>
            </template>
            <RouterLink v-else to="/login" class="bg-gold-300 text-black-700 px-6 py-2 hover:bg-white hover:text-black-700 transition-all duration-300 font-medium uppercase tracking-wider text-sm">
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
</style>
