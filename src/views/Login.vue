<script setup lang="ts">
import { ref, inject } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Mail, Lock, ArrowRight } from 'lucide-vue-next';

const email = ref('');
const password = ref('');
const loading = ref(false);
const showPassword = ref(false);
const rememberMe = ref(false);
const auth = inject<any>('auth');
const api = inject<any>('api');
const router = useRouter();

const isValidQQEmail = (e: string) => /^[0-9]+@qq\.com$/.test(e.toLowerCase());
const isValidPassword = (p: string) => p.length >= 6 && p.length <= 20;

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (!isValidQQEmail(value)) {
          callback(new Error('请使用QQ邮箱格式（例如：123456@qq.com）'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (!isValidPassword(value)) {
          callback(new Error('密码长度必须为6-20个字符'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

const formRef = ref();
const REMEMBER_EMAIL_COOKIE_KEY = 'rememberEmail';
const REMEMBER_EMAIL_COOKIE_DAYS = 30;

const setCookie = (key: string, value: string, days: number) => {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const getCookie = (key: string) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
};

const deleteCookie = (key: string) => {
  document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
};

const handleLogin = async () => {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    const data = await api.post('/api/login', {
      email: email.value.toLowerCase(),
      password: password.value,
    });
    auth.login(data.user, data.token);
    
    if (rememberMe.value) {
      setCookie(REMEMBER_EMAIL_COOKIE_KEY, email.value.toLowerCase(), REMEMBER_EMAIL_COOKIE_DAYS);
    } else {
      deleteCookie(REMEMBER_EMAIL_COOKIE_KEY);
    }

    ElMessage.success('登录成功');
    
    if (data.user.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/');
    }
  } catch (err: any) {
    const errorMsg = err.message || '登录失败';
    ElMessage.error(errorMsg);
  } finally {
    loading.value = false;
  }
};

const goToRegister = () => {
  router.push('/register');
};

const loadRememberedEmail = () => {
  localStorage.removeItem('rememberEmail');
  const remembered = getCookie(REMEMBER_EMAIL_COOKIE_KEY);
  if (remembered) {
    email.value = remembered;
    rememberMe.value = true;
  }
};

loadRememberedEmail();
</script>

<template>
  <div class="min-h-screen bg-white flex">
    <!-- 左侧装饰面板 -->
    <div class="hidden lg:flex lg:w-1/2 bg-black-700 relative overflow-hidden">
      <div class="absolute inset-0">
        <div class="absolute top-20 left-20 w-64 h-64 border border-gold-300/20"></div>
        <div class="absolute top-40 right-16 w-48 h-48 border border-gold-300/10"></div>
        <div class="absolute bottom-32 left-32 w-96 h-96 border border-gold-300/5"></div>
        <div class="absolute bottom-20 right-24 w-32 h-32 border border-gold-300/15"></div>
      </div>
      
      <div class="relative z-10 flex flex-col justify-center px-16">
        <div class="mb-8">
          <div class="w-16 h-0.5 bg-gold-300 mb-6"></div>
          <h1 class="font-display text-5xl text-white mb-4 leading-tight">
            在线考试系统
          </h1>
          <p class="text-black-300 text-lg font-light tracking-wide">
            Online Examination System
          </p>
        </div>
        
        <div class="space-y-6 text-black-400">
          <div class="flex items-start gap-4">
            <div class="w-2 h-2 bg-gold-300 mt-2 flex-shrink-0"></div>
            <p class="text-sm">安全可靠的在线考试平台</p>
          </div>
          <div class="flex items-start gap-4">
            <div class="w-2 h-2 bg-gold-300 mt-2 flex-shrink-0"></div>
            <p class="text-sm">实时监考与防作弊机制</p>
          </div>
          <div class="flex items-start gap-4">
            <div class="w-2 h-2 bg-gold-300 mt-2 flex-shrink-0"></div>
            <p class="text-sm">智能评分与数据分析</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧登录表单 -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
      <div class="w-full max-w-md">
        <div class="mb-12">
          <div class="w-12 h-0.5 bg-gold-300 mb-6"></div>
          <h2 class="font-display text-4xl text-black-700 mb-2">欢迎登录</h2>
          <p class="text-black-400">请输入您的账户信息</p>
        </div>

        <el-form
          ref="formRef"
          :model="{ email, password }"
          :rules="rules"
          label-width="100px"
          label-position="right"
          autocomplete="off"
          @submit.prevent="handleLogin"
          class="space-y-6"
        >
          <el-form-item prop="email" class="aligned-form-item">
            <template #label>
              <div class="flex items-center text-sm font-semibold text-black-600">
                <Mail class="w-4 h-4 mr-2 text-gold-300" />
                邮箱
              </div>
            </template>
            <el-input
              v-model="email"
              type="email"
              name="login_email_input"
              autocomplete="off"
              placeholder="例如：123456@qq.com"
              :disabled="loading"
              clearable
              size="large"
              class="login-input"
            />
          </el-form-item>

          <el-form-item prop="password" class="aligned-form-item">
            <template #label>
              <div class="flex items-center text-sm font-semibold text-black-600">
                <Lock class="w-4 h-4 mr-2 text-gold-300" />
                密码
              </div>
            </template>
            <el-input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              name="login_password_input"
              autocomplete="new-password"
              placeholder="请输入密码"
              :disabled="loading"
              size="large"
              class="login-input"
              show-password
            />
          </el-form-item>

          <div class="flex items-center justify-between">
            <el-checkbox v-model="rememberMe" label="记住我" />
            <a href="#" class="text-sm text-gold-600 hover:text-gold-700 font-medium">
              忘记密码？
            </a>
          </div>

          <div class="pt-4">
            <el-button
              native-type="submit"
              :loading="loading"
              class="w-full py-6 text-base font-bold login-btn"
            >
              <span class="flex items-center justify-center gap-2">
                {{ loading ? '正在登录...' : '登录' }}
                <ArrowRight class="w-4 h-4" />
              </span>
            </el-button>
          </div>
        </el-form>

        <div class="my-8 flex items-center">
          <div class="flex-grow border-t border-black-100"></div>
          <span class="px-4 text-xs text-black-400 uppercase tracking-wider">或</span>
          <div class="flex-grow border-t border-black-100"></div>
        </div>

        <div class="text-center">
          <p class="text-black-500 text-sm">还没有账户？</p>
          <button
            @click="goToRegister"
            class="mt-2 text-gold-600 hover:text-gold-700 font-semibold border-b border-gold-300 pb-0.5 hover:border-gold-600 transition-all"
          >
            立即注册
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.login-input .el-input__wrapper) {
  background-color: #1A1A1A;
  border: 0 !important;
  transition: all 0.3s ease;
  min-height: 48px;
  box-shadow: none !important;
  border-radius: 4px;
}

:deep(.login-input .el-input__wrapper:hover) {
  border: 0 !important;
  background-color: #1A1A1A;
}

:deep(.login-input.is-focus .el-input__wrapper) {
  background-color: #1A1A1A;
  border: 0 !important;
  box-shadow: inset 0 0 0 1px rgba(197, 160, 89, 0.75) !important;
}

:deep(.login-btn.el-button--primary) {
  background-color: #1E1E1E;
  border-color: #444444;
  color: #D1D1D1;
}

:deep(.login-btn.el-button--primary:hover) {
  background-color: #1E1E1E;
  border-color: #C5A059;
  color: #C5A059;
}

:deep(.el-checkbox__label) {
  color: #888888;
  font-size: 0.875rem;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #C5A059;
  border-color: #C5A059;
}

:deep(.aligned-form-item .el-form-item__label) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 48px;
  white-space: nowrap;
  line-height: 1.1;
  padding-right: 12px;
  margin-bottom: 0;
}

:deep(.aligned-form-item.is-required .el-form-item__label::before) {
  margin-right: 2px;
}

:deep(.aligned-form-item .el-form-item__label > div) {
  display: flex;
  align-items: center;
  height: 48px;
  white-space: nowrap;
}

:deep(.el-form-item__error) {
  color: #DC2626;
}
</style>
