<script setup lang="ts">
import { ref, inject } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const isLogin = ref(true);
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const auth = inject<any>('auth');
const api = inject<any>('api');
const router = useRouter();

// 验证QQ邮箱格式
const isValidQQEmail = (e: string) => /^[0-9]+@qq\.com$/.test(e.toLowerCase());

// 验证密码长度
const isValidPassword = (p: string) => p.length >= 6 && p.length <= 20;

// 表单验证规则
const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { 
      validator: (rule: any, value: string, callback: any) => {
        if (!isValidQQEmail(value)) {
          callback(new Error('请使用QQ邮箱格式（例如：123456@qq.com）'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { 
      validator: (rule: any, value: string, callback: any) => {
        if (!isValidPassword(value)) {
          callback(new Error('密码长度必须为6-20个字符'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ]
};

const formRef = ref();

const handleSubmit = async () => {
  error.value = '';
  
  if (!formRef.value) return;
  
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    if (isLogin.value) {
      // 登录
      const data = await api.post('/api/login', { 
        email: email.value.toLowerCase(), 
        password: password.value 
      });
      auth.login(data.user, data.token);
      // 管理员进入后台，普通用户进入首页
      if (data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
      ElMessage.success('登录成功');
    } else {
      // 注册
      await api.post('/api/register', { 
        email: email.value.toLowerCase(), 
        password: password.value 
      });
      ElMessage.success('注册成功，请登录');
      isLogin.value = true;
      email.value = '';
      password.value = '';
      formRef.value?.clearValidate();
    }
  } catch (err: any) {
    error.value = err.message || '操作失败';
    ElMessage.error(error.value);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 p-4">
    <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold text-gray-900">{{ isLogin ? '登录' : '注册' }}</h2>
        <p class="text-gray-500 mt-2">请登录以访问考试</p>
      </div>
      
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        class="mb-6"
      />

      <el-form
        ref="formRef"
        :model="{ email, password }"
        :rules="rules"
        @submit.prevent="handleSubmit"
        class="space-y-6"
      >
        <el-form-item label="QQ邮箱" prop="email">
          <el-input
            v-model="email"
            type="email"
            placeholder="例如：123456@qq.com"
            :disabled="loading"
            clearable
          />
          <template #label>
            <span class="text-sm font-medium text-gray-900">QQ邮箱</span>
          </template>
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="password"
            type="password"
            placeholder="6-20个字符"
            :disabled="loading"
            show-password
          />
          <template #label>
            <span class="text-sm font-medium text-gray-900">密码</span>
          </template>
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            native-type="submit"
            class="w-full"
            size="large"
          >
            {{ loading ? '处理中...' : (isLogin ? '立即登录' : '立即注册') }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="mt-6 text-center">
        <el-button
          text
          @click="isLogin = !isLogin"
          class="text-gray-600 hover:text-gray-900 font-medium text-sm"
        >
          {{ isLogin ? '没有账号？去注册' : '已有账号？去登录' }}
        </el-button>
      </div>
    </div>
  </div>
</template>
