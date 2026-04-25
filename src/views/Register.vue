<script setup lang="ts">
import { ref, inject } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const api = inject<any>('api');
const router = useRouter();

// 表单相关
const formRef = ref();

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
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== password.value) {
          callback(new Error('两次输入密码不一致'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

const handleRegister = async () => {
  if (!formRef.value) return;

  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    await api.post('/api/register', {
      email: email.value.toLowerCase(),
      password: password.value,
    });
    ElMessage.success('注册成功！请用邮箱和密码登录');
    // 注册成功后跳转到登录页
    setTimeout(() => {
      router.push('/login');
    }, 1500);
  } catch (err: any) {
    const errorMsg = err.message || '注册失败';
    ElMessage.error(errorMsg);
  } finally {
    loading.value = false;
  }
};

const goToLogin = () => {
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- 顶部装饰 -->
      <div class="text-center mb-12">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full shadow-lg mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h1 class="text-4xl font-bold text-gray-900 mb-2">创建账户</h1>
        <p class="text-gray-600">加入在线考试系统，开始学习之旅</p>
      </div>

      <!-- 注册表单卡片 -->
      <div class="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <el-form
          ref="formRef"
          :model="{ email, password, confirmPassword }"
          :rules="rules"
          @submit.prevent="handleRegister"
          class="space-y-5"
        >
          <!-- 邮箱字段 -->
          <el-form-item prop="email">
            <template #label>
              <div class="flex items-center text-sm font-semibold text-gray-900">
                <Mail class="w-4 h-4 mr-2 text-indigo-600" />
                QQ邮箱
              </div>
            </template>
            <el-input
              v-model="email"
              type="email"
              placeholder="例如：123456@qq.com"
              :disabled="loading"
              clearable
              class="register-input"
            />
            <div class="mt-2 text-xs text-gray-500">
              💡 提示：请输入有效的QQ邮箱地址
            </div>
          </el-form-item>

          <!-- 密码字段 -->
          <el-form-item prop="password">
            <template #label>
              <div class="flex items-center text-sm font-semibold text-gray-900">
                <Lock class="w-4 h-4 mr-2 text-indigo-600" />
                设置密码
              </div>
            </template>
            <el-input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="6-20个字符"
              :disabled="loading"
              class="register-input"
              show-password
            />
            <div class="mt-2 text-xs text-gray-500">
              📝 密码需要6-20个字符
            </div>
          </el-form-item>

          <!-- 确认密码字段 -->
          <el-form-item prop="confirmPassword">
            <template #label>
              <div class="flex items-center text-sm font-semibold text-gray-900">
                <Lock class="w-4 h-4 mr-2 text-indigo-600" />
                再次确认密码
              </div>
            </template>
            <el-input
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              placeholder="请再次输入密码"
              :disabled="loading"
              class="register-input"
              show-password
            />
          </el-form-item>

          <!-- 注册按钮 -->
          <div class="pt-4">
            <el-button
              type="primary"
              @click="handleRegister"
              :loading="loading"
              class="w-full py-3 text-lg font-bold"
            >
              {{ loading ? '正在创建账户...' : '创建账户' }}
            </el-button>
          </div>
        </el-form>

        <!-- 分隔线 -->
        <div class="my-8 flex items-center">
          <div class="flex-grow border-t border-gray-200"></div>
          <span class="px-3 text-xs text-gray-500">或</span>
          <div class="flex-grow border-t border-gray-200"></div>
        </div>

        <!-- 登录链接 -->
        <div class="text-center">
          <p class="text-gray-600 text-sm">已有账户？</p>
          <el-button
            type="text"
            @click="goToLogin"
            class="mt-2 text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            返回登录
          </el-button>
        </div>
      </div>

      <!-- 底部提示 -->
      <div class="mt-8 text-center text-xs text-gray-500">
        <p>注册即表示您同意我们的</p>
        <p class="mt-1">
          <a href="#" class="text-indigo-600 hover:underline">服务条款</a>
          和
          <a href="#" class="text-indigo-600 hover:underline">隐私政策</a>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.register-input .el-input__wrapper) {
  background-color: #f3f4f6;
  border-color: #e5e7eb;
  transition: all 0.3s ease;
}

:deep(.register-input .el-input__wrapper:hover) {
  border-color: #a5d6fd;
  background-color: #ffffff;
}

:deep(.register-input.is-focus .el-input__wrapper) {
  background-color: #ffffff;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #4f46e5 0%, #9333ea 100%);
  border: 0;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #4338ca 0%, #7e22ce 100%);
}
</style>
