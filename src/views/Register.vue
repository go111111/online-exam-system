<script setup lang="ts">
import { ref, inject } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Mail, Lock } from 'lucide-vue-next';

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const api = inject<any>('api');
const router = useRouter();

const formRef = ref();

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
  <div class="min-h-screen bg-white flex">
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

    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
      <div class="w-full max-w-md">
        <div class="mb-12">
          <div class="w-12 h-0.5 bg-gold-300 mb-6"></div>
          <h2 class="font-display text-4xl text-black-700 mb-2">创建账户</h2>
          <p class="text-black-400">加入在线考试系统，开始学习之旅</p>
        </div>

        <el-form
          ref="formRef"
          :model="{ email, password, confirmPassword }"
          :rules="rules"
          label-width="136px"
          label-position="right"
          autocomplete="off"
          @submit.prevent="handleRegister"
          class="space-y-6"
        >
          <el-form-item prop="email" class="aligned-form-item">
            <template #label>
              <div class="flex items-center text-sm font-semibold text-black-600">
                <Mail class="w-4 h-4 mr-2 text-gold-300" />
                QQ邮箱
              </div>
            </template>
            <el-input
              v-model="email"
              type="email"
              name="register_email_input"
              autocomplete="off"
              placeholder="例如：123456@qq.com"
              :disabled="loading"
              clearable
              size="large"
              class="register-input"
            />
            <div class="field-tip">
              请输入有效的QQ邮箱地址
            </div>
          </el-form-item>

          <el-form-item prop="password" class="aligned-form-item">
            <template #label>
              <div class="flex items-center text-sm font-semibold text-black-600">
                <Lock class="w-4 h-4 mr-2 text-gold-300" />
                设置密码
              </div>
            </template>
            <el-input
              v-model="password"
              type="password"
              name="register_password_input"
              autocomplete="new-password"
              placeholder="6-20个字符"
              :disabled="loading"
              size="large"
              class="register-input"
              show-password
            />
            <div class="field-tip">
              密码需要6-20个字符
            </div>
          </el-form-item>

          <el-form-item prop="confirmPassword" class="aligned-form-item">
            <template #label>
              <div class="flex items-center text-sm font-semibold text-black-600">
                <Lock class="w-4 h-4 mr-2 text-gold-300" />
                再次确认密码
              </div>
            </template>
            <el-input
              v-model="confirmPassword"
              type="password"
              name="register_confirm_password_input"
              autocomplete="new-password"
              placeholder="请再次输入密码"
              :disabled="loading"
              size="large"
              class="register-input"
              show-password
            />
            <div class="field-tip">
              请与上方密码保持一致
            </div>
          </el-form-item>

          <div class="pt-4">
            <el-button
              type="primary"
              @click="handleRegister"
              :loading="loading"
              class="w-full py-3 text-base font-bold"
            >
              {{ loading ? '正在创建账户...' : '创建账户' }}
            </el-button>
          </div>
        </el-form>

        <div class="my-8 flex items-center">
          <div class="flex-grow border-t border-black-100"></div>
          <span class="px-3 text-xs text-black-400">或</span>
          <div class="flex-grow border-t border-black-100"></div>
        </div>

        <div class="text-center">
          <p class="text-black-400 text-sm">已有账户？</p>
          <el-button
            type="text"
            @click="goToLogin"
            class="mt-2 text-gold-600 hover:text-gold-700 font-semibold"
          >
            返回登录
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.register-input .el-input__wrapper) {
  background-color: #ffffff;
  border-color: #e5e5e5;
  transition: all 0.3s ease;
  min-height: 44px;
}

:deep(.register-input .el-input__wrapper:hover) {
  border-color: #d4af37;
  background-color: #ffffff;
}

:deep(.register-input.is-focus .el-input__wrapper) {
  background-color: #ffffff;
  border-color: #d4af37;
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
}

:deep(.el-button--primary) {
  background-color: #111111;
  border: 1px solid #111111;
  color: #ffffff;
}

:deep(.el-button--primary:hover) {
  background-color: #d4af37;
  border-color: #d4af37;
  color: #111111;
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
  color: #666666;
  line-height: 1.2;
}
</style>
