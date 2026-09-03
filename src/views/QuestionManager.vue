<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { Plus, ChevronRight, X, Edit, Trash2, Upload } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const route = useRoute();
const id = route.params.id;
const api = inject<any>('api');

const questions = ref<any[]>([]);
const showAdd = ref(false);
const showEdit = ref(false);
const editingQId = ref<number | null>(null);
const newQ = ref({ type: 'choice', content: '', options: ['', '', '', ''], answer: '', score: 5, image: '' });
const imageFile = ref<File | null>(null);
const imagePreview = ref<string>('');

const questionTypes = [
  { value: 'choice', label: '单选题' },
  { value: 'multiple', label: '多选题' },
  { value: 'judge', label: '判断题' },
  { value: 'fill', label: '填空题' },
  { value: 'text', label: '简答题' },
  { value: 'analysis', label: '分析题' },
  { value: 'programming', label: '编程题' },
  { value: 'drawing', label: '绘图题' }
];
const optionQuestionTypes = ['choice', 'multiple', 'judge'];
const manualQuestionTypes = ['text', 'analysis', 'programming', 'drawing'];

const getQuestionTypeLabel = (type: string) => {
  const found = questionTypes.find((item) => item.value === type);
  return found?.label || '题目';
};

const optionLabel = (index: number) => String.fromCharCode(65 + index);
const isMultiChecked = (label: string) => String(newQ.value.answer || '').split(',').includes(label);
const toggleMultiAnswer = (label: string, checked: boolean) => {
  const parts = String(newQ.value.answer || '').split(',').filter(Boolean);
  const next = checked ? [...new Set([...parts, label])] : parts.filter((item) => item !== label);
  newQ.value.answer = next.sort().join(',');
};
const handleTypeChange = () => {
  if (newQ.value.type === 'judge') {
    newQ.value.options = ['正确', '错误'];
    newQ.value.answer = newQ.value.answer || 'A';
  } else if (newQ.value.type === 'choice' || newQ.value.type === 'multiple') {
    if (!newQ.value.options.length) newQ.value.options = ['', '', '', ''];
  } else {
    newQ.value.options = [];
  }
};

const fetchQuestions = async () => {
  questions.value = await api.get(`/api/admin/exams/${id}/questions`);
};

onMounted(fetchQuestions);

const resetForm = () => {
  newQ.value = { type: 'choice', content: '', options: ['', '', '', ''], answer: '', score: 5, image: '' };
  imageFile.value = null;
  imagePreview.value = '';
};

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    imageFile.value = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

const handleAdd = async () => {
  if (!newQ.value.content) {
    alert('请输入题目内容');
    return;
  }

  if (!manualQuestionTypes.includes(newQ.value.type) && !newQ.value.answer) {
    alert('请输入标准答案');
    return;
  }

  try {
    if (imageFile.value) {
      const formData = new FormData();
      formData.append('file', imageFile.value);
      formData.append('questionData', JSON.stringify(newQ.value));
      
      const response = await api.post(`/api/admin/exams/${id}/questions/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      showAdd.value = false;
      resetForm();
      fetchQuestions();
    } else {
      await api.post(`/api/admin/exams/${id}/questions`, newQ.value);
      showAdd.value = false;
      resetForm();
      fetchQuestions();
    }
  } catch (error) {
    alert('添加题目失败');
  }
};

const startEdit = (q: any) => {
  editingQId.value = q.id;
  newQ.value = { ...q, image: q.image || '' };
  imagePreview.value = q.image || '';
  showEdit.value = true;
};

const handleEdit = async () => {
  if (!editingQId.value) return;

  if (!newQ.value.content) {
    alert('请输入题目内容');
    return;
  }

  if (!manualQuestionTypes.includes(newQ.value.type) && !newQ.value.answer) {
    alert('请输入标准答案');
    return;
  }

  try {
    if (imageFile.value) {
      const formData = new FormData();
      formData.append('file', imageFile.value);
      formData.append('questionData', JSON.stringify(newQ.value));
      
      await api.put(`/api/admin/exams/${id}/questions/${editingQId.value}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } else {
      await api.put(`/api/admin/exams/${id}/questions/${editingQId.value}`, newQ.value);
    }
    
    showEdit.value = false;
    editingQId.value = null;
    resetForm();
    fetchQuestions();
  } catch (error) {
    alert('编辑题目失败');
  }
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
        <RouterLink to="/admin" class="p-2 text-black-400 hover:text-gold-300 transition-colors">
          <ChevronRight class="w-6 h-6 rotate-180" />
        </RouterLink>
        <div>
          <h1 class="font-display text-3xl text-black-700">题目管理</h1>
          <p class="text-black-400 mt-1">编辑和管理考试题目</p>
        </div>
      </div>
      <button 
        @click="showAdd = true"
        class="flex items-center bg-black-700 text-white px-6 py-2 font-bold hover:bg-gold-300 hover:text-black-700 transition-all duration-300 uppercase tracking-wider text-sm"
      >
        <Plus class="w-5 h-5 mr-2" />
        添加题目
      </button>
    </div>

    <div v-if="showAdd || showEdit" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div v-dialog-drag="'[data-dialog-drag-handle]'" class="bg-white w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-hidden">
        <div data-dialog-drag-handle class="flex justify-between items-center p-8 border-b border-black-100 cursor-grab active:cursor-grabbing select-none">
          <h2 class="font-display text-2xl text-black-700">{{ showEdit ? '编辑题目' : '添加题目' }}</h2>
          <button 
            @click="() => { showAdd = false; showEdit = false; resetForm(); }"
            class="p-2 text-black-400 hover:text-black-700 transition-colors"
          >
            <X class="w-6 h-6" />
          </button>
        </div>

        <div class="p-8 space-y-6 max-h-[70vh] overflow-y-auto detail-scrollbar">
          <div>
            <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">题目类型</label>
            <el-select
              v-model="newQ.type"
              class="w-full"
              popper-class="dark-select-popper"
              @change="handleTypeChange"
            >
              <el-option
                v-for="qt in questionTypes"
                :key="qt.value"
                :label="qt.label"
                :value="qt.value"
              />
            </el-select>
          </div>

          <div>
            <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">题目内容</label>
            <textarea 
              v-model="newQ.content"
              placeholder="请输入题目内容"
              class="w-full border border-black-200 bg-white px-4 py-3 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all duration-200 h-24 resize-none"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">题目图片（可选）</label>
            <div class="flex items-start gap-4">
              <div class="flex-1">
                <label class="flex items-center justify-center w-full h-32 border-2 border-dashed border-black-200 cursor-pointer hover:border-gold-300 transition-colors">
                  <div class="text-center">
                    <Upload class="w-8 h-8 mx-auto text-black-300 mb-2" />
                    <span class="text-sm text-black-400">点击上传图片</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    @change="handleImageUpload"
                    class="hidden"
                  />
                </label>
              </div>
              <div v-if="imagePreview" class="relative">
                <img :src="imagePreview" alt="预览" class="w-32 h-32 object-cover border border-black-100" />
                <button 
                  @click="() => { imageFile = null; imagePreview = ''; newQ.image = ''; }"
                  class="absolute -top-2 -right-2 bg-black-700 text-white p-1 hover:bg-gold-300 hover:text-black-700 transition-colors"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">分值（分）</label>
            <input 
              v-model.number="newQ.score"
              type="number"
              min="1"
              max="100"
              placeholder="5"
              class="w-full border border-black-200 bg-white px-4 py-3 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all duration-200"
            />
            <p class="text-xs text-black-400 mt-2">请输入1-100之间的整数</p>
          </div>

          <div v-if="optionQuestionTypes.includes(newQ.type)">
            <label class="block text-sm font-semibold text-black-600 mb-3 uppercase tracking-wider">选项</label>
            <div class="space-y-3">
              <div v-for="(opt, idx) in newQ.options" :key="idx" class="flex gap-2">
                <span class="flex items-center px-3 py-2 bg-black-50 font-semibold text-black-600 min-w-12">
                  {{ optionLabel(idx) }}
                </span>
                <input 
                  v-model="newQ.options[idx]"
                  placeholder="请输入选项内容"
                  :disabled="newQ.type === 'judge'"
                  class="flex-1 border border-black-200 bg-white px-4 py-2 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all duration-200"
                />
                <label v-if="newQ.type === 'multiple'" class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="isMultiChecked(optionLabel(idx))"
                    class="w-4 h-4 accent-gold-300"
                    @change="toggleMultiAnswer(optionLabel(idx), ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="text-sm text-black-600">正确</span>
                </label>
                <label v-else class="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    :value="optionLabel(idx)"
                    v-model="newQ.answer"
                    class="w-4 h-4 accent-gold-300"
                  />
                  <span class="text-sm text-black-600">正确</span>
                </label>
              </div>
            </div>
          </div>

          <div v-else-if="newQ.type === 'fill' || newQ.type === 'text' || newQ.type === 'analysis' || newQ.type === 'programming'">
            <label class="block text-sm font-semibold text-black-600 mb-2 uppercase tracking-wider">
              {{ manualQuestionTypes.includes(newQ.type) ? '参考答案或评分要点' : '标准答案' }}
            </label>
            <textarea 
              v-model="newQ.answer"
              placeholder="请输入标准答案、评分要点或参考代码"
              class="w-full border border-black-200 bg-white px-4 py-3 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 transition-all duration-200 h-20 resize-none"
            />
          </div>

          <div v-else-if="newQ.type === 'drawing'" class="p-4 bg-black-50 border border-black-100">
            <p class="text-sm text-black-600">
              <strong>绘图题说明：</strong>学生将在答题时使用绘图工具，将绘图内容保存为图片。管理员需要手动评分此类题目。
            </p>
          </div>

          <div class="flex gap-3 justify-end pt-4 border-t border-black-100">
            <button 
              @click="() => { showAdd = false; showEdit = false; resetForm(); }"
              class="px-6 py-2 border border-black-200 text-black-600 font-semibold hover:border-gold-300 hover:text-gold-600 transition-colors uppercase tracking-wider text-sm"
            >
              取消
            </button>
            <button 
              @click="showEdit ? handleEdit() : handleAdd()"
              class="px-6 py-2 bg-black-700 text-white font-semibold hover:bg-gold-300 hover:text-black-700 transition-colors uppercase tracking-wider text-sm"
            >
              {{ showEdit ? '保存修改' : '添加题目' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-8">
      <div v-for="(q, idx) in questions" :key="q.id" class="bg-white border border-black-100 p-8 hover:border-gold-300/50 transition-all duration-300">
        <div class="flex justify-between items-start mb-6">
          <div class="flex items-center gap-3">
            <span :class="cn(
              'text-xs font-bold uppercase tracking-widest px-3 py-1 border',
              optionQuestionTypes.includes(q.type) ? 'bg-black-50 text-black-600 border-black-200' : 
              q.type === 'fill' ? 'bg-gold-50 text-gold-700 border-gold-200' :
              q.type === 'drawing' ? 'bg-black-700 text-white border-black-700' :
              'bg-black-50 text-black-600 border-black-200'
            )">
              {{ getQuestionTypeLabel(q.type) }}
            </span>
            <span class="text-xs text-gold-600 font-semibold uppercase tracking-wider">{{ q.score }} 分</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-black-300 font-medium">#{{ idx + 1 }}</span>
            <button 
              @click="startEdit(q)"
              class="p-2 text-black-400 hover:text-gold-600 transition-colors"
            >
              <Edit class="w-5 h-5" />
            </button>
            <button 
              @click="handleDelete(q.id)"
              class="p-2 text-black-400 hover:text-red-600 transition-colors"
            >
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
        </div>
        <p class="text-lg text-black-700 font-medium mb-6 leading-relaxed">{{ q.content }}</p>
        <div v-if="q.image" class="mb-6">
          <img :src="`/api/uploads/${q.image}`" alt="题目图片" class="max-w-full h-auto border border-black-100" />
        </div>
        <div v-if="optionQuestionTypes.includes(q.type)" class="grid grid-cols-2 gap-4">
          <div v-for="(opt, i) in q.options" :key="i" :class="cn(
            'p-4 border text-sm',
            String(q.answer || '').split(',').includes(optionLabel(i)) ? 'bg-black-700 border-black-700 text-white' : 'bg-black-50 border-black-100 text-black-500'
          )">
            {{ opt }}
          </div>
        </div>
        <div v-if="q.type === 'fill' || q.type === 'text' || q.type === 'analysis' || q.type === 'programming'" class="p-4 bg-black-50 border border-black-100">
          <span class="text-xs font-bold text-black-600 uppercase block mb-2">参考答案</span>
          <p class="text-black-700">{{ q.answer || '暂无参考答案' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
