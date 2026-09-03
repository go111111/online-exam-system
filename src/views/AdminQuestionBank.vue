<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { Edit, Plus, RefreshCw, Shuffle, Trash2, X } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import AdminSidebar from '@/components/AdminSidebar.vue';
import { cn } from '@/lib/utils';

const api = inject<any>('api');

const questions = ref<any[]>([]);
const selectedIds = ref<number[]>([]);
const loading = ref(false);
const showQuestionDialog = ref(false);
const showPaperDialog = ref(false);
const editingQuestionId = ref<number | null>(null);
const filters = ref({ keyword: '', type: '' });
const questionForm = ref({
  type: 'choice',
  content: '',
  options: ['', '', '', ''],
  answer: '',
  score: 5,
  image: ''
});
const paperForm = ref({
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  duration_minutes: 60,
  status: 'closed',
  randomCount: 0
});

const questionTypes = [
  { value: 'choice', label: '单选题' },
  { value: 'multiple', label: '多选题' },
  { value: 'judge', label: '判断题' },
  { value: 'fill', label: '填空题' },
  { value: 'text', label: '简答题' },
  { value: 'analysis', label: '分析题' },
  { value: 'programming', label: '编程题' }
];
const optionQuestionTypes = ['choice', 'multiple', 'judge'];
const manualQuestionTypes = ['text', 'analysis', 'programming'];

const totalScore = computed(() =>
  questions.value
    .filter((item) => selectedIds.value.includes(item.id))
    .reduce((sum, item) => sum + Number(item.score || 0), 0)
);

const fetchQuestions = async () => {
  loading.value = true;
  try {
    questions.value = await api.get('/api/admin/question-bank', {
      params: {
        keyword: filters.value.keyword || undefined,
        type: filters.value.type || undefined
      }
    });
  } catch (err: any) {
    ElMessage.error(err.message || '题库加载失败');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchQuestions);

watch(
  () => questionForm.value.type,
  (type) => {
    if (type === 'judge') {
      questionForm.value.options = ['正确', '错误'];
      if (!['A', 'B', '正确', '错误'].includes(questionForm.value.answer)) {
        questionForm.value.answer = 'A';
      }
    } else if ((type === 'choice' || type === 'multiple') && questionForm.value.options.length < 2) {
      questionForm.value.options = ['', '', '', ''];
    } else if (!optionQuestionTypes.includes(type)) {
      questionForm.value.options = [];
    }
  }
);

const resetQuestionForm = () => {
  editingQuestionId.value = null;
  questionForm.value = {
    type: 'choice',
    content: '',
    options: ['', '', '', ''],
    answer: '',
    score: 5,
    image: ''
  };
};

const openCreateQuestion = () => {
  resetQuestionForm();
  showQuestionDialog.value = true;
};

const openEditQuestion = (row: any) => {
  editingQuestionId.value = row.id;
  questionForm.value = {
    type: row.type || 'text',
    content: row.content || '',
    options: row.options?.length ? [...row.options] : (row.type === 'judge' ? ['正确', '错误'] : ['', '', '', '']),
    answer: row.answer || '',
    score: Number(row.score || 5),
    image: row.image || ''
  };
  showQuestionDialog.value = true;
};

const addOption = () => {
  questionForm.value.options.push('');
};

const removeOption = (index: number) => {
  questionForm.value.options.splice(index, 1);
};

const optionLabel = (index: number) => String.fromCharCode(65 + index);

const toggleMultiAnswer = (label: string, checked: boolean) => {
  const parts = String(questionForm.value.answer || '').split(',').filter(Boolean);
  const next = checked ? [...new Set([...parts, label])] : parts.filter((item) => item !== label);
  questionForm.value.answer = next.sort().join(',');
};

const isMultiChecked = (label: string) => String(questionForm.value.answer || '').split(',').includes(label);

const saveQuestion = async () => {
  if (!questionForm.value.content) {
    ElMessage.error('题目内容不能为空');
    return;
  }
  if (!manualQuestionTypes.includes(questionForm.value.type) && !questionForm.value.answer) {
    ElMessage.error('请设置标准答案');
    return;
  }

  try {
    const payload = {
      ...questionForm.value,
      options: optionQuestionTypes.includes(questionForm.value.type) ? questionForm.value.options : []
    };
    if (editingQuestionId.value) {
      await api.put(`/api/admin/question-bank/${editingQuestionId.value}`, payload);
    } else {
      await api.post('/api/admin/question-bank', payload);
    }
    ElMessage.success('题目已保存');
    showQuestionDialog.value = false;
    resetQuestionForm();
    await fetchQuestions();
  } catch (err: any) {
    ElMessage.error(err.message || '保存题目失败');
  }
};

const deleteQuestion = async (id: number) => {
  if (!confirm('确定删除这道题目吗？')) return;
  await api.delete(`/api/admin/question-bank/${id}`);
  ElMessage.success('题目已删除');
  selectedIds.value = selectedIds.value.filter((item) => item !== id);
  await fetchQuestions();
};

const toggleSelect = (id: number, checked: boolean) => {
  selectedIds.value = checked
    ? [...new Set([...selectedIds.value, id])]
    : selectedIds.value.filter((item) => item !== id);
};

const generatePaper = async () => {
  try {
    const result = await api.post('/api/admin/question-bank/generate-paper', {
      ...paperForm.value,
      questionIds: selectedIds.value,
      randomCount: Number(paperForm.value.randomCount || 0)
    });
    ElMessage.success(`试卷已生成，共 ${result.questionCount} 道题`);
    showPaperDialog.value = false;
    selectedIds.value = [];
    paperForm.value = {
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      duration_minutes: 60,
      status: 'closed',
      randomCount: 0
    };
  } catch (err: any) {
    ElMessage.error(err.message || '生成试卷失败');
  }
};

const typeLabel = (type: string) => questionTypes.find((item) => item.value === type)?.label || '题目';
</script>

<template>
  <div class="admin-shell max-w-7xl mx-auto px-4 py-12">
    <div class="admin-layout flex flex-col lg:flex-row gap-8">
      <AdminSidebar />

      <main class="admin-main flex-1 min-w-0">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <div class="w-16 h-0.5 bg-gold-300 mb-6"></div>
            <h1 class="font-display text-3xl text-black-700">题库管理</h1>
            <p class="text-black-400 mt-1">维护题库题目，选择题目或随机抽题生成试卷</p>
          </div>
          <div class="flex gap-3">
            <button
              @click="showPaperDialog = true"
              class="inline-flex items-center px-4 py-2 bg-white border border-black-200 text-black-600 hover:border-gold-300 hover:text-gold-600 transition-all font-medium uppercase tracking-wider text-sm"
            >
              <Shuffle class="w-4 h-4 mr-2" />
              生成试卷
            </button>
            <button
              @click="openCreateQuestion"
              class="inline-flex items-center bg-black-700 text-white px-5 py-2 font-bold hover:bg-gold-300 hover:text-black-700 transition-all uppercase tracking-wider text-sm"
            >
              <Plus class="w-4 h-4 mr-2" />
              新增题目
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-white border border-black-100 p-5">
            <div class="text-xs text-black-400 uppercase tracking-widest">题目总数</div>
            <div class="font-display text-3xl text-black-700 mt-2">{{ questions.length }}</div>
          </div>
          <div class="bg-white border border-black-100 p-5">
            <div class="text-xs text-black-400 uppercase tracking-widest">已选题目</div>
            <div class="font-display text-3xl text-black-700 mt-2">{{ selectedIds.length }}</div>
          </div>
          <div class="bg-white border border-black-100 p-5">
            <div class="text-xs text-black-400 uppercase tracking-widest">已选分值</div>
            <div class="font-display text-3xl text-black-700 mt-2">{{ totalScore }}</div>
          </div>
          <div class="bg-white border border-black-100 p-5">
            <div class="text-xs text-black-400 uppercase tracking-widest">来源</div>
            <div class="font-display text-3xl text-black-700 mt-2">题库</div>
          </div>
        </div>

        <div class="bg-white border border-black-100 p-4 mb-5 grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3">
          <input
            v-model="filters.keyword"
            class="px-4 py-3 border border-black-200"
            placeholder="按题干或考试名称搜索"
            @keyup.enter="fetchQuestions"
          />
          <select v-model="filters.type" class="px-4 py-3 border border-black-200">
            <option value="">全部题型</option>
            <option v-for="item in questionTypes" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <button @click="fetchQuestions" class="inline-flex items-center justify-center px-4 py-3 bg-black-700 text-white font-bold">
            <RefreshCw class="w-4 h-4 mr-2" />
            查询
          </button>
        </div>

        <div class="bg-white border border-black-100 overflow-x-auto">
          <table class="w-full min-w-[1060px] text-left">
            <thead class="bg-black-50 border-b border-black-100">
              <tr>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">选择</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">题目</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">题型</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">分值</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">答案</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest">来源考试</th>
                <th class="px-5 py-4 text-xs font-bold text-black-500 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black-50">
              <tr v-if="loading">
                <td colspan="7" class="px-5 py-12 text-center text-black-400">加载中...</td>
              </tr>
              <tr v-else-if="questions.length === 0">
                <td colspan="7" class="px-5 py-12 text-center text-black-400">暂无题目</td>
              </tr>
              <tr v-for="row in questions" :key="row.id" class="hover:bg-gold-50/30">
                <td class="px-5 py-5">
                  <input
                    type="checkbox"
                    :checked="selectedIds.includes(row.id)"
                    class="w-4 h-4 accent-gold-300"
                    @change="toggleSelect(row.id, ($event.target as HTMLInputElement).checked)"
                  />
                </td>
                <td class="px-5 py-5">
                  <div class="font-bold text-black-700 line-clamp-2">{{ row.content }}</div>
                  <div v-if="row.options?.length" class="mt-2 text-xs text-black-400 line-clamp-1">
                    {{ row.options.join(' / ') }}
                  </div>
                </td>
                <td class="px-5 py-5">
                  <span class="px-3 py-1 border border-black-200 text-xs font-bold text-black-600">{{ typeLabel(row.type) }}</span>
                </td>
                <td class="px-5 py-5 font-mono text-gold-600 font-bold">{{ row.score }}</td>
                <td class="px-5 py-5 text-black-500">{{ row.answer || '人工批改' }}</td>
                <td class="px-5 py-5 text-black-400">{{ row.examTitle || '独立题库' }}</td>
                <td class="px-5 py-5 text-right">
                  <button @click="openEditQuestion(row)" class="p-2 text-black-400 hover:text-gold-600" title="编辑">
                    <Edit class="w-5 h-5" />
                  </button>
                  <button @click="deleteQuestion(row.id)" class="p-2 text-black-400 hover:text-red-600" title="删除">
                    <Trash2 class="w-5 h-5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <div v-if="showQuestionDialog" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div v-dialog-drag="'[data-dialog-drag-handle]'" class="bg-white w-full max-w-3xl shadow-2xl max-h-[85vh] overflow-hidden">
        <div data-dialog-drag-handle class="p-6 border-b border-black-100 flex justify-between items-center cursor-grab">
          <h2 class="font-display text-2xl text-black-700">{{ editingQuestionId ? '编辑题目' : '新增题目' }}</h2>
          <button @click="showQuestionDialog = false" class="p-2 text-black-400 hover:text-black-700">
            <X class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="saveQuestion" class="p-6 space-y-5 max-h-[70vh] overflow-y-auto detail-scrollbar">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select v-model="questionForm.type" class="px-4 py-3 border border-black-200">
              <option v-for="item in questionTypes" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
            <input v-model.number="questionForm.score" type="number" min="1" class="px-4 py-3 border border-black-200" placeholder="分值" />
          </div>

          <textarea v-model="questionForm.content" required class="w-full px-4 py-3 border border-black-200 resize-none" rows="4" placeholder="题目内容" />

          <div v-if="optionQuestionTypes.includes(questionForm.type)" class="space-y-3">
            <div class="text-sm font-semibold text-black-600 uppercase tracking-wider">选项与答案</div>
            <div v-for="(opt, index) in questionForm.options" :key="index" class="flex items-center gap-3">
              <span class="w-10 py-2 text-center bg-black-50 text-black-600 font-bold">{{ optionLabel(index) }}</span>
              <input v-model="questionForm.options[index]" :disabled="questionForm.type === 'judge'" class="flex-1 px-4 py-2 border border-black-200" placeholder="选项内容" />
              <label v-if="questionForm.type === 'multiple'" class="inline-flex items-center gap-2 text-sm text-black-600">
                <input type="checkbox" :checked="isMultiChecked(optionLabel(index))" @change="toggleMultiAnswer(optionLabel(index), ($event.target as HTMLInputElement).checked)" />
                正确
              </label>
              <label v-else class="inline-flex items-center gap-2 text-sm text-black-600">
                <input type="radio" :value="optionLabel(index)" v-model="questionForm.answer" />
                正确
              </label>
              <button v-if="questionForm.type !== 'judge'" type="button" @click="removeOption(index)" class="p-2 text-black-300 hover:text-red-600">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
            <button v-if="questionForm.type !== 'judge'" type="button" @click="addOption" class="px-4 py-2 border border-black-200 text-black-600">
              添加选项
            </button>
          </div>

          <div v-else>
            <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">
              {{ manualQuestionTypes.includes(questionForm.type) ? '参考答案或评分要点' : '标准答案' }}
            </label>
            <textarea v-model="questionForm.answer" class="w-full px-4 py-3 border border-black-200 resize-none" rows="4" placeholder="可填写参考答案、关键词或评分说明" />
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-black-100">
            <button type="button" @click="showQuestionDialog = false" class="px-5 py-2 border border-black-200 text-black-600">取消</button>
            <button type="submit" class="px-6 py-2 bg-black-700 text-white font-bold">保存题目</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showPaperDialog" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div v-dialog-drag="'[data-dialog-drag-handle]'" class="bg-white w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-hidden">
        <div data-dialog-drag-handle class="p-6 border-b border-black-100 flex justify-between items-center cursor-grab">
          <h2 class="font-display text-2xl text-black-700">生成试卷</h2>
          <button @click="showPaperDialog = false" class="p-2 text-black-400 hover:text-black-700">
            <X class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="generatePaper" class="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto detail-scrollbar">
          <input v-model="paperForm.title" required class="md:col-span-2 px-4 py-3 border border-black-200" placeholder="试卷标题" />
          <textarea v-model="paperForm.description" class="md:col-span-2 px-4 py-3 border border-black-200 resize-none" rows="3" placeholder="试卷说明" />
          <input v-model="paperForm.start_time" required type="datetime-local" class="px-4 py-3 border border-black-200" />
          <input v-model="paperForm.end_time" required type="datetime-local" class="px-4 py-3 border border-black-200" />
          <input v-model.number="paperForm.duration_minutes" required type="number" min="1" class="px-4 py-3 border border-black-200" placeholder="时长（分钟）" />
          <select v-model="paperForm.status" class="px-4 py-3 border border-black-200">
            <option value="closed">先关闭</option>
            <option value="open">直接开放</option>
          </select>
          <div class="md:col-span-2 bg-black-50 border border-black-100 p-4">
            <div class="text-sm text-black-600">当前已选择 {{ selectedIds.length }} 道题，合计 {{ totalScore }} 分。</div>
            <div class="mt-3 flex items-center gap-3">
              <label class="text-sm text-black-500">额外随机抽题</label>
              <input v-model.number="paperForm.randomCount" type="number" min="0" class="w-28 px-3 py-2 border border-black-200 bg-white" />
              <span class="text-sm text-black-400">道</span>
            </div>
          </div>
          <div class="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-black-100">
            <button type="button" @click="showPaperDialog = false" class="px-5 py-2 border border-black-200 text-black-600">取消</button>
            <button type="submit" class="px-6 py-2 bg-black-700 text-white font-bold">生成试卷</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
