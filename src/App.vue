<script setup lang="ts">
import { ref, onMounted, computed, provide, inject, watch } from 'vue';
import { useRouter, useRoute, RouterView, RouterLink } from 'vue-router';
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
  BarChart
} from 'lucide-vue-next';

// --- Auth Store ---
const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
const token = ref(localStorage.getItem('token'));

const login = (userData: any, userToken: string) => {
  user.value = userData;
  token.value = userToken;
  localStorage.setItem('user', JSON.stringify(userData));
  localStorage.setItem('token', userToken);
};

const logout = () => {
  user.value = null;
  token.value = null;
  localStorage.removeItem('user');
  localStorage.removeItem('token');
};

provide('auth', { user, token, login, logout });

// --- API Helper ---
const api = {
  get: async (url: string) => {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token.value}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  post: async (url: string, data: any) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token.value) headers['Authorization'] = `Bearer ${token.value}`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  put: async (url: string, data: any) => {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token.value}` },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  delete: async (url: string) => {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token.value}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

provide('api', api);
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
              <div class="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                <User class="w-4 h-4 text-gray-400" />
                <span class="text-sm font-medium text-gray-700">{{ user.username }}</span>
              </div>
              <button 
                @click="logout(); $router.push('/login')"
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
