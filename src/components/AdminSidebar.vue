<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { BarChart3, Bell, ChevronLeft, ClipboardList, FileCheck2 } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const route = useRoute();
const router = useRouter();

const navItems = [
  { label: '考试管理', path: '/admin', icon: ClipboardList },
  { label: '考卷批改', path: '/admin/grading', icon: FileCheck2 },
  { label: '通知处理', path: '/admin/notifications', icon: Bell },
  { label: '查看成绩', path: '/admin/results', icon: BarChart3 }
];

const activePath = computed(() => route.path);
const showBack = computed(() => activePath.value !== '/admin');

const isActive = (path: string) => {
  if (path === '/admin') {
    return activePath.value === '/admin' || activePath.value.startsWith('/admin/exams/');
  }
  return activePath.value.startsWith(path);
};

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/admin');
  }
};
</script>

<template>
  <aside class="w-full lg:w-64 shrink-0 border border-black-100 bg-white">
    <div class="p-6 border-b border-black-100">
      <button
        v-if="showBack"
        @click="goBack"
        class="mb-4 inline-flex items-center justify-center w-9 h-9 border border-black-200 text-black-500 hover:border-gold-300 hover:text-gold-600 transition-colors"
        title="返回上一页"
      >
        <ChevronLeft class="w-5 h-5" />
      </button>
      <div class="w-12 h-0.5 bg-gold-300 mb-4"></div>
      <h2 class="font-display text-xl text-black-700">后台管理</h2>
    </div>

    <nav class="p-3 space-y-1">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :class="cn(
          'flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider border transition-all',
          isActive(item.path)
            ? 'bg-black-700 text-white border-black-700'
            : 'bg-white text-black-500 border-transparent hover:border-gold-300 hover:text-gold-600'
        )"
      >
        <component :is="item.icon" class="w-4 h-4" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>
