<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { Plus, ChevronRight, X, Edit, Trash2 } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const route = useRoute();
const id = route.params.id;
const api = inject<any>('api');

const questions = ref<any[]>([]);
const showAdd = ref(false);
const showEdit = ref(false);
const editingQId = ref<number | null>(null);
const newQ = ref({ type: 'choice', content: '', options: ['', '', '', ''], answer: '', score: 5 });

const questionTypes = [
  { value: 'choice', label: '单选题' },
  { value: 'fill', label: '填空题' },
  { value: 'text', label: '简答题' },
  { value: 'drawing', label: '绘图题' }
];

const fetchQuestions = async () => {
  questions.value = await api.get(`/api/admin/exams/${id}/questions`);
};

onMounted(fetchQuestions);

const resetForm = () => {
  newQ.value = { type: 'choice', content: '', options: ['', '', '', ''], answer: '', score: 5 };
};

const handleAdd = async () => {
  if (!newQ.value.content) {
    alert('请输入题目内容');
    return;
  }

  if (newQ.value.type !== 'drawing' && !newQ.value.answer) {
    alert('请输入标准答案');
    return;
  }

  await api.post(`/api/admin/exams/${id}/questions`, newQ.value);
  showAdd.value = false;
  resetForm();
  fetchQuestions();
};

const startEdit = (q: any) => {
  editingQId.value = q.id;
  newQ.value = { ...q };
  showEdit.value = true;
};

const handleEdit = async () => {
  if (!editingQId.value) return;

  if (!newQ.value.content) {
    alert('请输入题目内容');
    return;
  }

  if (newQ.value.type !== 'drawing' && !newQ.value.answer) {
    alert('请输入标准答案');
    return;
  }

  await api.put(`/api/admin/exams/${id}/questions/${editingQId.value}`, newQ.value);
  showEdit.value = false;
  editingQId.value = null;
  resetForm();
  fetchQuestions();
};

const handleDelete = async (qid: number) => {
  if (confirm('确定删除这道题目吗？')) {
    await api.delete(`/api/admin/exams/${id}/questions/${qid}`);
    fetchQuestions();
  }
};
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-12">
    <div class="flex justify-between items-center mb-12">
      <div class="flex items-center space-x-4">
        <RouterLink to="/admin" class="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
          <ChevronRight class="w-6 h-6 rotate-180" />
        </RouterLink>
        <h1 class="text-3xl font-bold text-gray-900">题目管理</h1>
      </div>
      <button 
        @click="showAdd = true"
        class="flex items-center bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
      >
        <Plus class="w-5 h-5 mr-2" />
        添加题目
      </button>
    </div>

    <!-- 添加/编辑模态框 -->
    <div v-if="showAdd || showEdit" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-8">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-900">{{ showEdit ? '编辑题目' : '添加题目' }}</h2>
          <button 
            @click="() => { showAdd = false; showEdit = false; resetForm(); }"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="w-6 h-6" />
          </button>
        </div>

        <!-- 题目类型 -->
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">题目类型 *</label>
          <select 
            v-model="newQ.type"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option v-for="qt in questionTypes" :key="qt.value" :value="qt.value">
              {{ qt.label }}
            </option>
          </select>
        </div>

        <!-- 题目内容 -->
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">题目内容 *</label>
          <textarea 
            v-model="newQ.content"
            placeholder="请输入题目内容"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
          />
        </div>

        <!-- 分数 -->
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">分数</label>
          <input 
            v-model.number="newQ.score"
            type="number"
            min="0"
            placeholder="5"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <!-- 单选题选项 -->
        <div v-if="newQ.type === 'choice'" class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-3">选项</label>
          <div class="space-y-3">
            <div v-for="(opt, idx) in newQ.options" :key="idx" class="flex gap-2">
              <span class="flex items-center px-3 py-2 bg-gray-100 rounded-lg font-semibold text-gray-600 min-w-12">
                {{ String.fromCharCode(65 + idx) }}
              </span>
              <input 
                v-model="newQ.options[idx]"
                placeholder="请输入选项内容"
                class="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  :value="opt"
                  v-model="newQ.answer"
                  class="w-4 h-4"
                />
                <span class="text-sm text-gray-600">正确</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 填空题/简答题标准答案 -->
        <div v-else-if="newQ.type === 'fill' || newQ.type === 'text'" class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">标准答案 *</label>
          <textarea 
            v-model="newQ.answer"
            placeholder="请输入标准答案"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
          />
        </div>

        <!-- 绘图题提示 -->
        <div v-else-if="newQ.type === 'drawing'" class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p class="text-sm text-blue-700">
            <strong>绘图题说明：</strong>学生将在答题时使用绘图工具，将绘图内容保存为图片。管理员需要手动评分此类题目。
          </p>
        </div>

        <!-- 按钮 -->
        <div class="flex gap-3 justify-end">
          <button 
            @click="() => { showAdd = false; showEdit = false; resetForm(); }"
            class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button 
            @click="showEdit ? handleEdit() : handleAdd()"
            class="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            {{ showEdit ? '保存修改' : '添加题目' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 题目列表 -->
    <div class="space-y-6">
      <div v-for="(q, idx) in questions" :key="q.id" class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-start mb-4">
          <span :class="cn(
            'text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full',
            q.type === 'choice' ? 'bg-blue-100 text-blue-700' : 
            q.type === 'fill' ? 'bg-green-100 text-green-700' :
            q.type === 'drawing' ? 'bg-purple-100 text-purple-700' :
            'bg-orange-100 text-orange-700'
          )">
            {{ q.type === 'choice' ? '单选题' : q.type === 'fill' ? '填空题' : q.type === 'drawing' ? '绘图题' : '简答题' }}
          </span>
          <div class="flex items-center space-x-2">
            <span class="text-gray-400 font-medium">#{{ idx + 1 }}</span>
            <span class="text-gray-400 font-medium">{{ q.score }}分</span>
            <button 
              @click="startEdit(q)"
              class="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <Edit class="w-5 h-5" />
            </button>
            <button 
              @click="handleDelete(q.id)"
              class="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
        </div>
        <p class="text-lg text-gray-900 font-medium mb-6">{{ q.content }}</p>
        <div v-if="q.type === 'choice'" class="grid grid-cols-2 gap-4">
          <div v-for="(opt, i) in q.options" :key="i" :class="cn(
            'p-3 rounded-xl border text-sm',
            q.answer === opt ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-500'
          )">
            {{ opt }}
          </div>
        </div>
        <div v-if="q.type === 'fill' || q.type === 'text'" class="p-4 bg-green-50 border border-green-100 rounded-xl">
          <span class="text-xs font-bold text-green-600 uppercase block mb-1">参考答案</span>
          <p class="text-green-700">{{ q.answer || '暂无参考答案' }}</p>
        </div>
      </div>
    </div>

    <div v-if="showAdd" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-2xl font-bold text-gray-900">添加题目</h2>
            <button @click="showAdd = false" class="p-2 text-gray-400 hover:text-gray-600">
              <X class="w-6 h-6" />
            </button>
          </div>
          <form @submit.prevent="handleAdd" class="space-y-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">题目类型</label>
              <select 
                v-model="newQ.type"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="choice">单选题</option>
                <option value="fill">填空题</option>
                <option value="text">简答题</option>
                <option value="drawing">绘图题</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">题目内容</label>
              <textarea 
                required
                v-model="newQ.content"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                rows="3"
              />
            </div>
            <div v-if="newQ.type === 'choice'" class="grid grid-cols-2 gap-4">
              <div v-for="(_, i) in newQ.options" :key="i">
                <label class="block text-xs font-bold text-gray-400 mb-1">选项 {{ String.fromCharCode(65 + i) }}</label>
                <input 
                  type="text" 
                  required
                  v-model="newQ.options[i]"
                  class="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div v-if="newQ.type === 'drawing'" class="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p class="text-sm text-blue-700">
                <strong>绘图题说明：</strong>学生将在答题时使用绘图工具，将绘图内容保存为图片。管理员需要手动评分此类题目。
              </p>
            </div>
            <div v-if="newQ.type !== 'drawing'">
              <label class="block text-sm font-bold text-gray-700 mb-2">正确答案</label>
              <select 
                v-if="newQ.type === 'choice'"
                v-model="newQ.answer"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              >
                <option value="">请选择正确答案</option>
                <option v-for="opt in newQ.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <input 
                v-else
                type="text" 
                required
                v-model="newQ.answer"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="请输入参考答案"
              />
            </div>
            <button type="submit" class="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all">
              确认添加
            </button>
          </form>
      </div>
    </div>

    <div v-if="showEdit" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-2xl font-bold text-gray-900">编辑题目</h2>
            <button @click="showEdit = false" class="p-2 text-gray-400 hover:text-gray-600">
              <X class="w-6 h-6" />
            </button>
          </div>
          <form @submit.prevent="handleEdit" class="space-y-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">题目类型</label>
              <select 
                v-model="newQ.type"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="choice">单选题</option>
                <option value="fill">填空题</option>
                <option value="text">简答题</option>
                <option value="drawing">绘图题</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">题目内容</label>
              <textarea 
                required
                v-model="newQ.content"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                rows="3"
              />
            </div>
            <div v-if="newQ.type === 'choice'" class="grid grid-cols-2 gap-4">
              <div v-for="(_, i) in newQ.options" :key="i">
                <label class="block text-xs font-bold text-gray-400 mb-1">选项 {{ String.fromCharCode(65 + i) }}</label>
                <input 
                  type="text" 
                  required
                  v-model="newQ.options[i]"
                  class="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">正确答案</label>
              <select 
                v-if="newQ.type === 'choice'"
                v-model="newQ.answer"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              >
                <option value="">请选择正确答案</option>
                <option v-for="opt in newQ.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <textarea 
                v-else-if="newQ.type === 'fill' || newQ.type === 'text'"
                v-model="newQ.answer"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                rows="3"
                placeholder="请输入参考答案"
              />
              <div v-else-if="newQ.type === 'drawing'" class="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p class="text-sm text-blue-700">
                  <strong>绘图题说明：</strong>学生将在答题时使用绘图工具，将绘图内容保存为图片。管理员需要手动评分此类题目。
                </p>
              </div>
            </div>
            <button type="submit" class="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all">
              确认编辑
            </button>
          </form>
      </div>
    </div>
  </div>
</template>
