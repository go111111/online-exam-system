<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { useRoute } from 'vue-router';
import { Plus, ChevronRight, X, Edit, Trash2 } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const route = useRoute();
const id = route.params.id;
const api = inject<any>('api');

const questions = ref<any[]>([]);
const showAdd = ref(false);
const showEdit = ref(false);
const editingQId = ref<number | null>(null);
const newQ = ref({ type: 'choice', content: '', options: ['', '', '', ''], answer: '' });

const fetchQuestions = async () => {
  questions.value = await api.get(`/api/admin/exams/${id}/questions`);
};

onMounted(fetchQuestions);

const handleAdd = async () => {
  await api.post(`/api/admin/exams/${id}/questions`, newQ.value);
  showAdd.value = false;
  newQ.value = { type: 'choice', content: '', options: ['', '', '', ''], answer: '' };
  fetchQuestions();
};

const startEdit = (q: any) => {
  editingQId.value = q.id;
  newQ.value = { ...q };
  showEdit.value = true;
};

const handleEdit = async () => {
  if (!editingQId.value) return;
  await api.put(`/api/admin/exams/${id}/questions/${editingQId.value}`, newQ.value);
  showEdit.value = false;
  editingQId.value = null;
  newQ.value = { type: 'choice', content: '', options: ['', '', '', ''], answer: '' };
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

    <div class="space-y-6">
      <div v-for="(q, idx) in questions" :key="q.id" class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-start mb-4">
          <span class="text-xs font-bold text-indigo-500 uppercase tracking-widest">
            {{ q.type === 'choice' ? '单选题' : q.type === 'fill' ? '填空题' : '简答题' }}
          </span>
          <div class="flex items-center space-x-2">
            <span class="text-gray-400 font-medium">#{{ idx + 1 }}</span>
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
              确认编辑
            </button>
          </form>
      </div>
    </div>
  </div>
</template>
