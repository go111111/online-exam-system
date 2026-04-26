<script setup lang="ts">
import { inject } from 'vue';
import { RouterView, RouterLink, useRouter } from 'vue-router';
import { 
  LogOut, 
  User, 
  Shield, 
  Clock, 
  FileText, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  AlertTriangle,
  Menu,
  X,
  ChevronRight,
  Timer,
  Eye,
  BarChart,
  Bell
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
  <div class="min-h-screen bg-white font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
    <!-- Navbar -->
    <nav v-if="$route.path !== '/login'" class="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center space-x-2">
            <Shield class="w-8 h-8 text-indigo-600" />
            <RouterLink to="/" class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              在线考试系统
            </RouterLink>
          </div>
          <div class="flex items-center space-x-4">
            <template v-if="user">
              <RouterLink v-if="user.role === 'admin'" to="/admin" class="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                后台管理
              </RouterLink>
              <NotificationCenter />
              <div class="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                <User class="w-4 h-4 text-gray-400" />
                <span class="text-sm font-medium text-gray-700">{{ user.email }}</span>
              </div>
              <button 
                @click="handleLogout"
                class="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <LogOut class="w-5 h-5" />
              </button>
            </template>
            <RouterLink v-else to="/login" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
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
