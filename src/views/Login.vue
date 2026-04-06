<script setup lang="ts">
import { ref, inject } from 'vue';
import { useRouter } from 'vue-router';
import { AlertTriangle } from 'lucide-vue-next';

const isLogin = ref(true);
const username = ref('');
const password = ref('');
const error = ref('');
const auth = inject<any>('auth');
const api = inject<any>('api');
const router = useRouter();

const handleSubmit = async () => {
  error.value = '';
  try {
    if (isLogin.value) {
      const data = await api.post('/api/login', { username: username.value, password: password.value });
      auth.login(data.user, data.token);
      router.push('/');
    } else {
      await api.post('/api/register', { username: username.value, password: password.value });
      isLogin.value = true;
      alert('注册成功，请登录');
    }
  } catch (err: any) {
    error.value = err.message || '操作失败';
  }
};
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 p-4">
    <div class="bg-white p-8 rounded-2xl shadow-xl shadow-indigo-100 w-full max-w-md border border-gray-100">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold text-gray-900">{{ isLogin ? '欢迎回来' : '创建账户' }}</h2>
        <p class="text-gray-500 mt-2">{{ isLogin ? '请输入您的凭据以访问考试' : '加入我们的在线考试平台' }}</p>
      </div>
      
      <div v-if="error" class="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center space-x-2">
        <AlertTriangle class="w-4 h-4" />
        <span>{{ error }}</span>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
          <input 
            type="text" 
            v-model="username"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            placeholder="请输入用户名"
            required
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
          <input 
            type="password" 
            v-model="password"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            placeholder="请输入密码"
            required
          />
        </div>
        <button 
          type="submit"
          class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          {{ isLogin ? '立即登录' : '立即注册' }}
        </button>
      </form>

      <div class="mt-8 text-center">
        <button 
          @click="isLogin = !isLogin"
          class="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
        >
          {{ isLogin ? '没有账号？去注册' : '已有账号？去登录' }}
        </button>
      </div>
    </div>
  </div>
</template>
