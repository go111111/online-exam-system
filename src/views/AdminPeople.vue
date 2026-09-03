<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import { Edit, Plus, RefreshCw, Trash2, X } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import AdminSidebar from '@/components/AdminSidebar.vue';

const api = inject<any>('api');

const activeTab = ref<'users' | 'classes' | 'majors'>('users');
const users = ref<any[]>([]);
const classes = ref<any[]>([]);
const majors = ref<any[]>([]);
const loading = ref(false);
const showUserDialog = ref(false);
const showClassDialog = ref(false);
const showMajorDialog = ref(false);
const editingUserId = ref<number | null>(null);
const editingClassId = ref<number | null>(null);
const editingMajorId = ref<number | null>(null);

const userForm = ref({
  email: '',
  password: '',
  fullName: '',
  role: 'student',
  studentNo: '',
  teacherNo: '',
  classId: '',
  majorId: '',
  phone: '',
  status: 'active'
});
const classForm = ref({ name: '', majorId: '', grade: '', description: '' });
const majorForm = ref({ name: '', code: '', description: '' });

const students = computed(() => users.value.filter((item) => item.role === 'student'));
const teachers = computed(() => users.value.filter((item) => item.role === 'teacher'));

const fetchAll = async () => {
  loading.value = true;
  try {
    const [userRows, classRows, majorRows] = await Promise.all([
      api.get('/api/admin/users'),
      api.get('/api/admin/academic/classes'),
      api.get('/api/admin/academic/majors')
    ]);
    users.value = userRows;
    classes.value = classRows;
    majors.value = majorRows;
  } catch (err: any) {
    ElMessage.error(err.message || '人员数据加载失败');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchAll);

const resetUserForm = () => {
  editingUserId.value = null;
  userForm.value = {
    email: '',
    password: '',
    fullName: '',
    role: 'student',
    studentNo: '',
    teacherNo: '',
    classId: '',
    majorId: '',
    phone: '',
    status: 'active'
  };
};

const openCreateUser = () => {
  resetUserForm();
  showUserDialog.value = true;
};

const openEditUser = (row: any) => {
  editingUserId.value = row.id;
  userForm.value = {
    email: row.email || '',
    password: '',
    fullName: row.fullName || '',
    role: row.role || 'student',
    studentNo: row.studentNo || '',
    teacherNo: row.teacherNo || '',
    classId: row.classId || '',
    majorId: row.majorId || '',
    phone: row.phone || '',
    status: row.status || 'active'
  };
  showUserDialog.value = true;
};

const saveUser = async () => {
  try {
    const payload = {
      ...userForm.value,
      classId: userForm.value.classId || null,
      majorId: userForm.value.majorId || null
    };
    if (editingUserId.value) {
      await api.put(`/api/admin/users/${editingUserId.value}`, payload);
    } else {
      await api.post('/api/admin/users', { ...payload, password: payload.password || '123456' });
    }
    ElMessage.success('用户信息已保存');
    showUserDialog.value = false;
    resetUserForm();
    await fetchAll();
  } catch (err: any) {
    ElMessage.error(err.message || '保存失败');
  }
};

const deleteUser = async (id: number) => {
  if (!confirm('确定删除该用户吗？')) return;
  await api.delete(`/api/admin/users/${id}`);
  ElMessage.success('用户已删除');
  await fetchAll();
};

const openCreateClass = () => {
  editingClassId.value = null;
  classForm.value = { name: '', majorId: '', grade: '', description: '' };
  showClassDialog.value = true;
};

const openEditClass = (row: any) => {
  editingClassId.value = row.id;
  classForm.value = {
    name: row.name || '',
    majorId: row.majorId || '',
    grade: row.grade || '',
    description: row.description || ''
  };
  showClassDialog.value = true;
};

const saveClass = async () => {
  const payload = { ...classForm.value, majorId: classForm.value.majorId || null };
  if (editingClassId.value) {
    await api.put(`/api/admin/academic/classes/${editingClassId.value}`, payload);
  } else {
    await api.post('/api/admin/academic/classes', payload);
  }
  ElMessage.success('班级已保存');
  showClassDialog.value = false;
  await fetchAll();
};

const deleteClass = async (id: number) => {
  if (!confirm('确定删除该班级吗？')) return;
  await api.delete(`/api/admin/academic/classes/${id}`);
  ElMessage.success('班级已删除');
  await fetchAll();
};

const openCreateMajor = () => {
  editingMajorId.value = null;
  majorForm.value = { name: '', code: '', description: '' };
  showMajorDialog.value = true;
};

const openEditMajor = (row: any) => {
  editingMajorId.value = row.id;
  majorForm.value = { name: row.name || '', code: row.code || '', description: row.description || '' };
  showMajorDialog.value = true;
};

const saveMajor = async () => {
  if (editingMajorId.value) {
    await api.put(`/api/admin/academic/majors/${editingMajorId.value}`, majorForm.value);
  } else {
    await api.post('/api/admin/academic/majors', majorForm.value);
  }
  ElMessage.success('专业已保存');
  showMajorDialog.value = false;
  await fetchAll();
};

const deleteMajor = async (id: number) => {
  if (!confirm('确定删除该专业吗？')) return;
  await api.delete(`/api/admin/academic/majors/${id}`);
  ElMessage.success('专业已删除');
  await fetchAll();
};

const roleLabel = (role: string) => {
  if (role === 'admin') return '管理员';
  if (role === 'teacher') return '教师';
  return '学生';
};
</script>

<template>
  <div class="admin-shell max-w-7xl mx-auto px-4 py-12">
    <div class="admin-layout flex flex-col lg:flex-row gap-8">
      <AdminSidebar />

      <main class="admin-main flex-1 min-w-0">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <div class="w-16 h-0.5 bg-gold-300 mb-6"></div>
            <h1 class="font-display text-3xl text-black-700">人员管理</h1>
            <p class="text-black-400 mt-1">维护教师、学生、班级和专业基础资料</p>
          </div>
          <button
            @click="fetchAll"
            class="inline-flex items-center px-4 py-2 bg-white border border-black-200 text-black-600 hover:border-gold-300 hover:text-gold-600 transition-all font-medium uppercase tracking-wider text-sm"
          >
            <RefreshCw class="w-4 h-4 mr-2" />
            刷新
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-white border border-black-100 p-5">
            <div class="text-xs text-black-400 uppercase tracking-widest">用户总数</div>
            <div class="font-display text-3xl text-black-700 mt-2">{{ users.length }}</div>
          </div>
          <div class="bg-white border border-black-100 p-5">
            <div class="text-xs text-black-400 uppercase tracking-widest">学生</div>
            <div class="font-display text-3xl text-black-700 mt-2">{{ students.length }}</div>
          </div>
          <div class="bg-white border border-black-100 p-5">
            <div class="text-xs text-black-400 uppercase tracking-widest">教师</div>
            <div class="font-display text-3xl text-black-700 mt-2">{{ teachers.length }}</div>
          </div>
          <div class="bg-white border border-black-100 p-5">
            <div class="text-xs text-black-400 uppercase tracking-widest">班级 / 专业</div>
            <div class="font-display text-3xl text-black-700 mt-2">{{ classes.length }} / {{ majors.length }}</div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div class="flex border border-black-100 bg-white">
            <button
              v-for="tab in [
                { key: 'users', label: '用户' },
                { key: 'classes', label: '班级' },
                { key: 'majors', label: '专业' }
              ]"
              :key="tab.key"
              @click="activeTab = tab.key as any"
              :class="[
                'px-5 py-3 text-sm font-bold uppercase tracking-wider border-r last:border-r-0 border-black-100',
                activeTab === tab.key ? 'bg-black-700 text-white' : 'bg-white text-black-500 hover:text-gold-600'
              ]"
            >
              {{ tab.label }}
            </button>
          </div>

          <button
            v-if="activeTab === 'users'"
            @click="openCreateUser"
            class="inline-flex items-center bg-black-700 text-white px-5 py-2 font-bold hover:bg-gold-300 hover:text-black-700 transition-all uppercase tracking-wider text-sm"
          >
            <Plus class="w-4 h-4 mr-2" />
            新增用户
          </button>
          <button
            v-else-if="activeTab === 'classes'"
            @click="openCreateClass"
            class="inline-flex items-center bg-black-700 text-white px-5 py-2 font-bold hover:bg-gold-300 hover:text-black-700 transition-all uppercase tracking-wider text-sm"
          >
            <Plus class="w-4 h-4 mr-2" />
            新增班级
          </button>
          <button
            v-else
            @click="openCreateMajor"
            class="inline-flex items-center bg-black-700 text-white px-5 py-2 font-bold hover:bg-gold-300 hover:text-black-700 transition-all uppercase tracking-wider text-sm"
          >
            <Plus class="w-4 h-4 mr-2" />
            新增专业
          </button>
        </div>

        <div v-if="activeTab === 'users'" class="bg-white border border-black-100 overflow-x-auto">
          <table class="w-full min-w-[1100px] text-left">
            <thead class="bg-black-50 border-b border-black-100">
              <tr>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">姓名</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">角色</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">邮箱</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">学号/工号</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">班级</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">专业</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">状态</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black-50">
              <tr v-if="loading">
                <td colspan="8" class="px-5 py-12 text-center text-black-400">加载中...</td>
              </tr>
              <tr v-for="row in users" :key="row.id" class="hover:bg-gold-50/30">
                <td class="px-5 py-5 font-bold text-black-700">{{ row.fullName || '-' }}</td>
                <td class="px-5 py-5 text-black-600">{{ roleLabel(row.role) }}</td>
                <td class="px-5 py-5 text-black-500">{{ row.email }}</td>
                <td class="px-5 py-5 font-mono text-black-500">{{ row.studentNo || row.teacherNo || '-' }}</td>
                <td class="px-5 py-5 text-black-500">{{ row.className || '-' }}</td>
                <td class="px-5 py-5 text-black-500">{{ row.majorName || '-' }}</td>
                <td class="px-5 py-5 text-black-500">{{ row.status === 'disabled' ? '停用' : '启用' }}</td>
                <td class="px-5 py-5 text-right">
                  <button @click="openEditUser(row)" class="p-2 text-black-400 hover:text-gold-600" title="编辑">
                    <Edit class="w-5 h-5" />
                  </button>
                  <button @click="deleteUser(row.id)" class="p-2 text-black-400 hover:text-red-600" title="删除">
                    <Trash2 class="w-5 h-5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="activeTab === 'classes'" class="bg-white border border-black-100 overflow-x-auto">
          <table class="w-full min-w-[760px] text-left">
            <thead class="bg-black-50 border-b border-black-100">
              <tr>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">班级</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">年级</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">专业</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">说明</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black-50">
              <tr v-for="row in classes" :key="row.id" class="hover:bg-gold-50/30">
                <td class="px-5 py-5 font-bold text-black-700">{{ row.name }}</td>
                <td class="px-5 py-5 text-black-500">{{ row.grade || '-' }}</td>
                <td class="px-5 py-5 text-black-500">{{ row.majorName || '-' }}</td>
                <td class="px-5 py-5 text-black-400">{{ row.description || '-' }}</td>
                <td class="px-5 py-5 text-right">
                  <button @click="openEditClass(row)" class="p-2 text-black-400 hover:text-gold-600"><Edit class="w-5 h-5" /></button>
                  <button @click="deleteClass(row.id)" class="p-2 text-black-400 hover:text-red-600"><Trash2 class="w-5 h-5" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="bg-white border border-black-100 overflow-x-auto">
          <table class="w-full min-w-[680px] text-left">
            <thead class="bg-black-50 border-b border-black-100">
              <tr>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">专业</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">代码</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">说明</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black-50">
              <tr v-for="row in majors" :key="row.id" class="hover:bg-gold-50/30">
                <td class="px-5 py-5 font-bold text-black-700">{{ row.name }}</td>
                <td class="px-5 py-5 font-mono text-black-500">{{ row.code || '-' }}</td>
                <td class="px-5 py-5 text-black-400">{{ row.description || '-' }}</td>
                <td class="px-5 py-5 text-right">
                  <button @click="openEditMajor(row)" class="p-2 text-black-400 hover:text-gold-600"><Edit class="w-5 h-5" /></button>
                  <button @click="deleteMajor(row.id)" class="p-2 text-black-400 hover:text-red-600"><Trash2 class="w-5 h-5" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <div v-if="showUserDialog" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div v-dialog-drag="'[data-dialog-drag-handle]'" class="bg-white w-full max-w-3xl shadow-2xl max-h-[85vh] overflow-hidden">
        <div data-dialog-drag-handle class="p-6 border-b border-black-100 flex justify-between items-center cursor-grab">
          <h2 class="font-display text-2xl text-black-700">{{ editingUserId ? '编辑用户' : '新增用户' }}</h2>
          <button @click="showUserDialog = false" class="p-2 text-black-400 hover:text-black-700"><X class="w-6 h-6" /></button>
        </div>
        <form @submit.prevent="saveUser" class="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto detail-scrollbar">
          <input v-model="userForm.fullName" class="px-4 py-3 border border-black-200" placeholder="姓名" />
          <input v-model="userForm.email" required class="px-4 py-3 border border-black-200" placeholder="邮箱" />
          <input v-model="userForm.password" type="password" class="px-4 py-3 border border-black-200" :placeholder="editingUserId ? '留空则不改密码' : '默认 123456'" />
          <select v-model="userForm.role" class="px-4 py-3 border border-black-200">
            <option value="student">学生</option>
            <option value="teacher">教师</option>
            <option value="admin">管理员</option>
          </select>
          <input v-model="userForm.studentNo" class="px-4 py-3 border border-black-200" placeholder="学号" />
          <input v-model="userForm.teacherNo" class="px-4 py-3 border border-black-200" placeholder="工号" />
          <select v-model="userForm.classId" class="px-4 py-3 border border-black-200">
            <option value="">未分配班级</option>
            <option v-for="item in classes" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <select v-model="userForm.majorId" class="px-4 py-3 border border-black-200">
            <option value="">未分配专业</option>
            <option v-for="item in majors" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <input v-model="userForm.phone" class="px-4 py-3 border border-black-200" placeholder="手机号" />
          <select v-model="userForm.status" class="px-4 py-3 border border-black-200">
            <option value="active">启用</option>
            <option value="disabled">停用</option>
          </select>
          <div class="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-black-100">
            <button type="button" @click="showUserDialog = false" class="px-5 py-2 border border-black-200 text-black-600">取消</button>
            <button type="submit" class="px-6 py-2 bg-black-700 text-white font-bold">保存</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showClassDialog" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white w-full max-w-xl shadow-2xl">
        <div class="p-6 border-b border-black-100 flex justify-between items-center">
          <h2 class="font-display text-2xl text-black-700">{{ editingClassId ? '编辑班级' : '新增班级' }}</h2>
          <button @click="showClassDialog = false" class="p-2 text-black-400 hover:text-black-700"><X class="w-6 h-6" /></button>
        </div>
        <form @submit.prevent="saveClass" class="p-6 space-y-4">
          <input v-model="classForm.name" required class="w-full px-4 py-3 border border-black-200" placeholder="班级名称" />
          <input v-model="classForm.grade" class="w-full px-4 py-3 border border-black-200" placeholder="年级，如 2024" />
          <select v-model="classForm.majorId" class="w-full px-4 py-3 border border-black-200">
            <option value="">未关联专业</option>
            <option v-for="item in majors" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <textarea v-model="classForm.description" class="w-full px-4 py-3 border border-black-200 resize-none" rows="3" placeholder="说明" />
          <div class="flex justify-end gap-3 pt-4 border-t border-black-100">
            <button type="button" @click="showClassDialog = false" class="px-5 py-2 border border-black-200 text-black-600">取消</button>
            <button type="submit" class="px-6 py-2 bg-black-700 text-white font-bold">保存</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showMajorDialog" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white w-full max-w-xl shadow-2xl">
        <div class="p-6 border-b border-black-100 flex justify-between items-center">
          <h2 class="font-display text-2xl text-black-700">{{ editingMajorId ? '编辑专业' : '新增专业' }}</h2>
          <button @click="showMajorDialog = false" class="p-2 text-black-400 hover:text-black-700"><X class="w-6 h-6" /></button>
        </div>
        <form @submit.prevent="saveMajor" class="p-6 space-y-4">
          <input v-model="majorForm.name" required class="w-full px-4 py-3 border border-black-200" placeholder="专业名称" />
          <input v-model="majorForm.code" class="w-full px-4 py-3 border border-black-200" placeholder="专业代码" />
          <textarea v-model="majorForm.description" class="w-full px-4 py-3 border border-black-200 resize-none" rows="3" placeholder="说明" />
          <div class="flex justify-end gap-3 pt-4 border-t border-black-100">
            <button type="button" @click="showMajorDialog = false" class="px-5 py-2 border border-black-200 text-black-600">取消</button>
            <button type="submit" class="px-6 py-2 bg-black-700 text-white font-bold">保存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
