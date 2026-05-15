<script setup lang="ts">
import { ref, computed } from 'vue';
import { CheckCircle, Image as ImageIcon, PenTool, Upload, X } from 'lucide-vue-next';
import DrawingCanvas from './DrawingCanvas.vue';

interface Props {
  questionId: number;
  questionType: 'choice' | 'fill' | 'text' | 'drawing';
  disabled?: boolean;
}

interface Emits {
  'submit-answer': [data: { 
    questionId: number; 
    answerText?: string; 
    file?: File; 
    drawingData?: string;
    submissionType: 'text' | 'file' | 'canvas';
  }];
  'update:modelValue': [value: any];
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
});

const emit = defineEmits<Emits>();

const answer = ref<string>('');
const uploadedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const drawingData = ref<string>('');
const showDrawing = ref(false);

const hasUploadedFile = computed(() => !!uploadedFile.value);
const fileName = computed(() => uploadedFile.value?.name || '');
const fileSize = computed(() => {
  if (!uploadedFile.value) return '';
  const size = uploadedFile.value.size;
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
  return (size / (1024 * 1024)).toFixed(2) + ' MB';
});

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = input.files;

  saveSelectedFile(files?.[0]);
};

const saveSelectedFile = (file?: File) => {
  if (!file) return;

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    alert('只支持图片格式的文件');
    return;
  }

  // 验证文件大小 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('文件大小不能超过10MB');
    return;
  }

  uploadedFile.value = file;
};

const handleDrop = (e: DragEvent) => {
  saveSelectedFile(e.dataTransfer?.files?.[0]);
};

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const removeFile = () => {
  uploadedFile.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

const submitAnswer = async () => {
  if (props.questionType === 'choice' && !answer.value) {
    alert('请选择答案');
    return;
  }
  
  if ((props.questionType === 'fill' || props.questionType === 'text') && !answer.value) {
    alert('请输入答案');
    return;
  }

  if (props.questionType === 'drawing' && !drawingData.value && !uploadedFile.value) {
    alert('请先绘制或上传答案');
    return;
  }

  let submissionType: 'text' | 'file' | 'canvas' = 'text';
  if (uploadedFile.value) {
    submissionType = 'file';
  } else if (drawingData.value && props.questionType === 'drawing') {
    submissionType = 'canvas';
  }

  const submissionData = {
    questionId: props.questionId,
    answerText: answer.value || '',
    file: uploadedFile.value,
    drawingData: drawingData.value,
    submissionType
  };

  emit('submit-answer', submissionData);
};

const handleDrawingSave = (canvasJson: string) => {
  drawingData.value = canvasJson;
  showDrawing.value = false;
};
</script>

<template>
  <div class="bg-white border border-black-100 p-6">
    <!-- 单选题 -->
    <div v-if="questionType === 'choice'" class="space-y-4">
      <div class="space-y-2">
        <slot name="options">
          <!-- Options will be passed via slot from parent -->
        </slot>
      </div>
      <button 
        @click="submitAnswer"
        class="w-full bg-black-700 text-white py-3 hover:bg-gold-300 hover:text-black-700 transition-all duration-300 font-bold uppercase tracking-wider text-sm"
        :disabled="disabled"
      >
        提交答案
      </button>
    </div>

    <!-- 填空题/简答题 -->
    <div v-else-if="questionType === 'fill' || questionType === 'text'" class="space-y-4">
      <textarea 
        v-model="answer"
        :placeholder="questionType === 'fill' ? '请填写答案' : '请输入答案'"
        class="w-full border border-black-200 bg-white px-4 py-3 focus:border-gold-300 focus:outline-none focus:ring-1 focus:ring-gold-300 resize-none h-24 transition-all"
        :disabled="disabled"
      />
      <button 
        @click="submitAnswer"
        class="w-full bg-black-700 text-white py-3 hover:bg-gold-300 hover:text-black-700 transition-all duration-300 font-bold uppercase tracking-wider text-sm"
        :disabled="disabled"
      >
        提交答案
      </button>
    </div>

    <!-- 绘图题 -->
    <div v-else-if="questionType === 'drawing'" class="space-y-4">
      <!-- 绘图选项卡 -->
      <div class="flex border-b border-black-100">
        <button 
          @click="showDrawing = true"
          :class="[
            'inline-flex items-center px-4 py-3 font-bold border-b-2 transition-colors uppercase tracking-wider text-sm',
            showDrawing 
              ? 'border-black-700 text-black-700' 
              : 'border-transparent text-black-400 hover:text-gold-600'
          ]"
        >
          <PenTool class="w-4 h-4 mr-2" />
          在线绘制
        </button>
        <button 
          @click="showDrawing = false"
          :class="[
            'inline-flex items-center px-4 py-3 font-bold border-b-2 transition-colors uppercase tracking-wider text-sm',
            !showDrawing 
              ? 'border-black-700 text-black-700' 
              : 'border-transparent text-black-400 hover:text-gold-600'
          ]"
        >
          <Upload class="w-4 h-4 mr-2" />
          上传图片
        </button>
      </div>

      <!-- 绘图画布 -->
      <div v-if="showDrawing" class="py-4">
        <DrawingCanvas 
          v-model="drawingData"
          :canvasWidth="600"
          :canvasHeight="400"
          :disabled="disabled"
          @save="handleDrawingSave"
        />
      </div>

      <!-- 文件上传 -->
      <div v-else class="py-4">
        <div 
          @click="triggerFileInput"
          @dragover.prevent="true"
          @drop.prevent="handleDrop"
          :class="[
            'border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
            hasUploadedFile 
              ? 'border-gold-300 bg-gold-50' 
              : 'border-black-200 hover:border-gold-300 hover:bg-gold-50/40'
          ]"
        >
          <input 
            ref="fileInputRef"
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            class="hidden"
          />

          <div v-if="hasUploadedFile" class="space-y-3">
            <ImageIcon class="w-8 h-8 text-gold-600 mx-auto" />
            <p class="font-bold text-black-700">{{ fileName }}</p>
            <p class="text-sm text-black-400">{{ fileSize }}</p>
            <button 
              @click.stop="removeFile"
              class="inline-flex items-center gap-2 px-3 py-1 border border-black-200 text-black-600 text-sm hover:border-gold-300 hover:text-gold-600 transition-colors"
            >
              <X class="w-4 h-4" />
              重新选择
            </button>
          </div>

          <div v-else class="space-y-2">
            <Upload class="w-8 h-8 text-black-300 mx-auto" />
            <p class="font-bold text-black-700">点击上传或拖拽图片</p>
            <p class="text-sm text-black-400">支持 PNG, JPG, GIF 等格式，最大 10MB</p>
          </div>
        </div>

        <p v-if="drawingData" class="mt-3 text-sm text-gold-700 flex items-center gap-2">
          <CheckCircle class="w-4 h-4" />
          已保存绘图数据
        </p>
      </div>

      <!-- 提交按钮 -->
      <button 
        @click="submitAnswer"
        class="w-full bg-black-700 text-white py-3 hover:bg-gold-300 hover:text-black-700 transition-all duration-300 font-bold uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="disabled || (!showDrawing && !hasUploadedFile && !drawingData) || (showDrawing && !drawingData)"
      >
        提交答案
      </button>
    </div>
  </div>
</template>

<style scoped>
input[type="file"] {
  display: none;
}
</style>
