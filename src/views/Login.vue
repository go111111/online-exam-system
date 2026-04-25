<script setup lang="ts">
import { ref, inject } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const email = ref('');
const password = ref('');
const loading = ref(false);
const showPassword = ref(false);
const rememberMe = ref(false);
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
    
    // 保存记住我的状态（仅保存邮箱到 Cookie）
    if (rememberMe.value) {
      setCookie(REMEMBER_EMAIL_COOKIE_KEY, email.value.toLowerCase(), REMEMBER_EMAIL_COOKIE_DAYS);
    } else {
      deleteCookie(REMEMBER_EMAIL_COOKIE_KEY);
    }

    ElMessage.success('登录成功');
    
    // 管理员进入后台，普通用户进入首页
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

// 加载记住的邮箱
const loadRememberedEmail = () => {
  // 清理旧逻辑遗留，避免与 Cookie 逻辑冲突
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
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-white flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- 顶部装饰 -->
      <div class="text-center mb-12">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-full shadow-lg mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2m14-4V7a2 2 0 00-2-2H7a2 2 0 00-2 2v2"/></svg>
        </div>
        <h1 class="text-4xl font-bold text-gray-900 mb-2">欢迎登录</h1>
        <p class="text-gray-600">在线考试系统</p>
      </div>

      <!-- 登录表单卡片 -->
      <div class="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <el-form
          ref="formRef"
          :model="{ email, password }"
          :rules="rules"
          label-width="136px"
          label-position="right"
          autocomplete="off"
          @submit.prevent="handleLogin"
          class="space-y-5"
        >
          <!-- 邮箱字段 -->
          <el-form-item prop="email" class="aligned-form-item">
            <template #label>
              <div class="flex items-center text-sm font-semibold text-gray-900">
                <Mail class="w-4 h-4 mr-2 text-indigo-600" />
                QQ邮箱
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
            <div class="field-tip">
              💡 请输入您的QQ邮箱地址
            </div>
          </el-form-item>

          <!-- 密码字段 -->
          <el-form-item prop="password" class="aligned-form-item">
            <template #label>
              <div class="flex items-center text-sm font-semibold text-gray-900">
                <Lock class="w-4 h-4 mr-2 text-indigo-600" />
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
            <div class="field-tip">
              📝 请输入6-20位登录密码
            </div>
          </el-form-item>

          <!-- 记住我和忘记密码 -->
          <div class="flex items-center justify-between">
            <el-checkbox v-model="rememberMe" label="记住我" />
            <a href="#" class="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              忘记密码？
            </a>
          </div>

          <!-- 登录按钮 -->
          <div class="pt-4">
            <el-button
              type="primary"
              @click="handleLogin"
              :loading="loading"
              class="w-full py-3 text-lg font-bold"
            >
              {{ loading ? '正在登录...' : '登录' }}
            </el-button>
          </div>
        </el-form>

        <!-- 分隔线 -->
        <div class="my-8 flex items-center">
          <div class="flex-grow border-t border-gray-200"></div>
          <span class="px-3 text-xs text-gray-500">或</span>
          <div class="flex-grow border-t border-gray-200"></div>
        </div>

        <!-- 注册链接 -->
        <div class="text-center">
          <p class="text-gray-600 text-sm">还没有账户？</p>
          <el-button
            type="text"
            @click="goToRegister"
            class="mt-2 text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            立即注册
          </el-button>
        </div>
      </div>

      
    </div>
  </div>
</template>

<style scoped>
:deep(.login-input .el-input__wrapper) {
  background-color: #f3f4f6;
  border-color: #e5e7eb;
  transition: all 0.3s ease;
  min-height: 44px;
}

:deep(.login-input .el-input__wrapper:hover) {
  border-color: #a5d6fd;
  background-color: #ffffff;
}

:deep(.login-input.is-focus .el-input__wrapper) {
  background-color: #ffffff;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
  border: 0;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #4338ca 0%, #1d4ed8 100%);
}

:deep(.el-checkbox__label) {
  color: #666666;
  font-size: 0.875rem;
}

:deep(.aligned-form-item .el-form-item__label) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 44px;
  white-space: nowrap;
  line-height: 1.1;
  padding-right: 10px;
  margin-bottom: 0;
}

:deep(.aligned-form-item.is-required .el-form-item__label::before) {
  margin-right: 2px;
}

:deep(.aligned-form-item .el-form-item__label > div) {
  display: flex;
  align-items: center;
  height: 44px;
  white-space: nowrap;
}

:deep(.aligned-form-item .el-form-item__label-wrap) {
  display: flex;
  align-items: center;
}

.field-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.2;
}
</style>
