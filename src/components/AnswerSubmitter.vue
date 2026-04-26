<script setup lang="ts">
import { ref, computed } from 'vue';
import { Upload, X, Image as ImageIcon } from 'lucide-vue-next';
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
const uploadProgress = ref(0);
const isUploading = ref(false);
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
  
  if (files && files.length > 0) {
    const file = files[0];
    
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
  }
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

  if (props.questionType === 'drawing' && !drawingData.value) {
    alert('请先绘制或上传答案');
    return;
  }

  const submissionData = {
    questionId: props.questionId,
    answerText: answer.value || '',
    file: uploadedFile.value,
    drawingData: drawingData.value,
    submissionType: 'text' as const
  };

  if (uploadedFile.value) {
    submissionData.submissionType = 'file';
  } else if (drawingData.value && props.questionType === 'drawing') {
    submissionData.submissionType = 'canvas';
  }

  emit('submit-answer', submissionData);
};

const handleDrawingSave = (canvasJson: string) => {
  drawingData.value = canvasJson;
  showDrawing.value = false;
};
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 p-6">
    <!-- 单选题 -->
    <div v-if="questionType === 'choice'" class="space-y-4">
      <div class="space-y-2">
        <slot name="options">
          <!-- Options will be passed via slot from parent -->
        </slot>
      </div>
      <button 
        @click="submitAnswer"
        class="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
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
        class="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24"
        :disabled="disabled"
      />
      <button 
        @click="submitAnswer"
        class="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
        :disabled="disabled"
      >
        提交答案
      </button>
    </div>

    <!-- 绘图题 -->
    <div v-else-if="questionType === 'drawing'" class="space-y-4">
      <!-- 绘图选项卡 -->
      <div class="flex gap-2 border-b border-gray-200">
        <button 
          @click="showDrawing = true"
          :class="[
            'px-4 py-2 font-semibold border-b-2 transition-colors',
            showDrawing 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          📐 在线绘制
        </button>
        <button 
          @click="showDrawing = false"
          :class="[
            'px-4 py-2 font-semibold border-b-2 transition-colors',
            !showDrawing 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          📤 上传图片
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
          @drop.prevent="(e) => handleFileSelect(e as DragEvent)"
          :class="[
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            hasUploadedFile 
              ? 'border-green-400 bg-green-50' 
              : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
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
            <ImageIcon class="w-8 h-8 text-green-600 mx-auto" />
            <p class="font-semibold text-gray-900">{{ fileName }}</p>
            <p class="text-sm text-gray-600">{{ fileSize }}</p>
            <button 
              @click.stop="removeFile"
              class="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
            >
              <X class="w-4 h-4" />
              重新选择
            </button>
          </div>

          <div v-else class="space-y-2">
            <Upload class="w-8 h-8 text-gray-400 mx-auto" />
            <p class="font-semibold text-gray-900">点击上传或拖拽图片</p>
            <p class="text-sm text-gray-600">支持 PNG, JPG, GIF 等格式，最大 10MB</p>
          </div>
        </div>

        <p v-if="drawingData" class="mt-3 text-sm text-green-600 flex items-center gap-2">
          <span>✓</span> 已保存绘图数据
        </p>
      </div>

      <!-- 提交按钮 -->
      <button 
        @click="submitAnswer"
        class="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
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
