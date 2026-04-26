<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ChevronDown, Download, Trash2, Undo2 } from 'lucide-vue-next';

interface Props {
  modelValue?: string; // Base64 encoded image or canvas JSON
  canvasWidth?: number;
  canvasHeight?: number;
  disabled?: boolean;
}

interface EmitsFunctions {
  'update:modelValue': [value: string];
  save: [canvasJson: string];
}

const props = withDefaults(defineProps<Props>(), {
  canvasWidth: 800,
  canvasHeight: 600,
  disabled: false
});

const emit = defineEmits<EmitsFunctions>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);
const isDrawing = ref(false);
const lineColor = ref('#000000');
const lineWidth = ref(2);
const colorPickerOpen = ref(false);
const brushSizes = [1, 2, 3, 5, 8];
const tools = [
  { id: 'pen', label: '画笔', icon: '✏️' },
  { id: 'eraser', label: '橡皮', icon: '🧹' },
  { id: 'line', label: '直线', icon: '📏' },
  { id: 'rectangle', label: '矩形', icon: '◻️' },
  { id: 'circle', label: '圆形', icon: '⭕' }
];

const currentTool = ref<string>('pen');
const drawingHistory = ref<string[]>([]);
const currentDrawing = ref<any>(null);

// 线条预设颜色
const presetColors = ['#000000', '#FF0000', '#00AA00', '#0000FF', '#FFAA00', '#FF00FF', '#00AAAA'];

const availableBrushSizes = computed(() => brushSizes);

const initCanvas = () => {
  if (!canvasRef.value) return;
  
  const canvas = canvasRef.value;
  ctx.value = canvas.getContext('2d');
  
  if (ctx.value) {
    ctx.value.fillStyle = '#FFFFFF';
    ctx.value.fillRect(0, 0, canvas.width, canvas.height);
    
    // 加载之前的绘图
    if (props.modelValue) {
      try {
        const data = JSON.parse(props.modelValue);
        loadDrawing(data);
      } catch (e) {
        console.log('无效的绘图数据');
      }
    }
  }
};

const startDrawing = (e: MouseEvent) => {
  if (props.disabled || !ctx.value || !canvasRef.value) return;
  
  const rect = canvasRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // 保存当前画布状态到历史
  saveDrawingState();
  
  isDrawing.value = true;
  currentDrawing.value = { startX: x, startY: y, x, y, tool: currentTool.value };
  
  if (currentTool.value === 'pen') {
    ctx.value.beginPath();
    ctx.value.moveTo(x, y);
  }
};

const draw = (e: MouseEvent) => {
  if (!isDrawing.value || !ctx.value || !canvasRef.value) return;
  
  const rect = canvasRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (currentTool.value === 'pen') {
    ctx.value.lineTo(x, y);
    ctx.value.strokeStyle = lineColor.value;
    ctx.value.lineWidth = lineWidth.value;
    ctx.value.lineCap = 'round';
    ctx.value.lineJoin = 'round';
    ctx.value.stroke();
  } else if (currentTool.value === 'eraser') {
    ctx.value.clearRect(x - lineWidth.value / 2, y - lineWidth.value / 2, lineWidth.value, lineWidth.value);
  } else if (currentTool.value === 'line' || currentTool.value === 'rectangle' || currentTool.value === 'circle') {
    // 预览绘制
    currentDrawing.value = { ...currentDrawing.value, x, y };
    redrawPreview();
  }
};

const stopDrawing = () => {
  if (!isDrawing.value || !ctx.value || !currentDrawing.value) return;
  
  isDrawing.value = false;
  
  // 绘制最终形状
  if (currentTool.value === 'line') {
    drawLine(currentDrawing.value.startX, currentDrawing.value.startY, currentDrawing.value.x, currentDrawing.value.y);
  } else if (currentTool.value === 'rectangle') {
    drawRectangle(currentDrawing.value.startX, currentDrawing.value.startY, currentDrawing.value.x, currentDrawing.value.y);
  } else if (currentTool.value === 'circle') {
    drawCircle(currentDrawing.value.startX, currentDrawing.value.startY, currentDrawing.value.x, currentDrawing.value.y);
  }
  
  currentDrawing.value = null;
};

const redrawPreview = () => {
  if (!ctx.value || !canvasRef.value || !currentDrawing.value) return;
  
  // 重绘历史
  redrawFromHistory();
  
  // 绘制预览
  ctx.value.strokeStyle = lineColor.value;
  ctx.value.lineWidth = lineWidth.value;
  ctx.value.fillStyle = 'transparent';
  
  if (currentTool.value === 'line') {
    ctx.value.beginPath();
    ctx.value.moveTo(currentDrawing.value.startX, currentDrawing.value.startY);
    ctx.value.lineTo(currentDrawing.value.x, currentDrawing.value.y);
    ctx.value.stroke();
  } else if (currentTool.value === 'rectangle') {
    const w = currentDrawing.value.x - currentDrawing.value.startX;
    const h = currentDrawing.value.y - currentDrawing.value.startY;
    ctx.value.strokeRect(currentDrawing.value.startX, currentDrawing.value.startY, w, h);
  } else if (currentTool.value === 'circle') {
    const dx = currentDrawing.value.x - currentDrawing.value.startX;
    const dy = currentDrawing.value.y - currentDrawing.value.startY;
    const radius = Math.sqrt(dx * dx + dy * dy);
    ctx.value.beginPath();
    ctx.value.arc(currentDrawing.value.startX, currentDrawing.value.startY, radius, 0, Math.PI * 2);
    ctx.value.stroke();
  }
};

const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
  if (!ctx.value) return;
  ctx.value.strokeStyle = lineColor.value;
  ctx.value.lineWidth = lineWidth.value;
  ctx.value.beginPath();
  ctx.value.moveTo(x1, y1);
  ctx.value.lineTo(x2, y2);
  ctx.value.stroke();
};

const drawRectangle = (x1: number, y1: number, x2: number, y2: number) => {
  if (!ctx.value) return;
  ctx.value.strokeStyle = lineColor.value;
  ctx.value.lineWidth = lineWidth.value;
  const w = x2 - x1;
  const h = y2 - y1;
  ctx.value.strokeRect(x1, y1, w, h);
};

const drawCircle = (x1: number, y1: number, x2: number, y2: number) => {
  if (!ctx.value) return;
  ctx.value.strokeStyle = lineColor.value;
  ctx.value.lineWidth = lineWidth.value;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const radius = Math.sqrt(dx * dx + dy * dy);
  ctx.value.beginPath();
  ctx.value.arc(x1, y1, radius, 0, Math.PI * 2);
  ctx.value.stroke();
};

const saveDrawingState = () => {
  if (!canvasRef.value) return;
  drawingHistory.value.push(canvasRef.value.toDataURL());
  // 限制历史记录长度
  if (drawingHistory.value.length > 20) {
    drawingHistory.value.shift();
  }
};

const redrawFromHistory = () => {
  if (!ctx.value || !canvasRef.value || drawingHistory.value.length === 0) return;
  
  const img = new Image();
  img.onload = () => {
    ctx.value!.fillStyle = '#FFFFFF';
    ctx.value!.fillRect(0, 0, canvasRef.value!.width, canvasRef.value!.height);
    ctx.value!.drawImage(img, 0, 0);
  };
  img.src = drawingHistory.value[drawingHistory.value.length - 1];
};

const undo = () => {
  if (drawingHistory.value.length === 0) return;
  
  drawingHistory.value.pop();
  
  if (drawingHistory.value.length === 0) {
    // 清空画布
    if (ctx.value && canvasRef.value) {
      ctx.value.fillStyle = '#FFFFFF';
      ctx.value.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    }
  } else {
    redrawFromHistory();
  }
};

const clear = () => {
  if (!ctx.value || !canvasRef.value) return;
  if (confirm('确定要清空画布吗？')) {
    ctx.value.fillStyle = '#FFFFFF';
    ctx.value.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    drawingHistory.value = [];
  }
};

const saveDrawing = async () => {
  if (!canvasRef.value) return;
  
  // 保存为 JSON 格式（包含所有绘图数据）
  const canvasJson = JSON.stringify({
    width: canvasRef.value.width,
    height: canvasRef.value.height,
    imageData: canvasRef.value.toDataURL()
  });
  
  emit('update:modelValue', canvasJson);
  emit('save', canvasJson);
};

const downloadImage = () => {
  if (!canvasRef.value) return;
  
  const link = document.createElement('a');
  link.href = canvasRef.value.toDataURL('image/png');
  link.download = `drawing-${Date.now()}.png`;
  link.click();
};

const loadDrawing = (data: any) => {
  if (!ctx.value || !canvasRef.value) return;
  
  const img = new Image();
  img.onload = () => {
    ctx.value!.drawImage(img, 0, 0);
  };
  img.src = data.imageData;
};

onMounted(initCanvas);
</script>

<template>
  <div class="bg-white rounded-lg shadow-lg overflow-hidden">
    <!-- 工具栏 -->
    <div class="bg-gray-100 p-4 border-b border-gray-200">
      <div class="flex flex-wrap gap-4 items-center">
        <!-- 工具选择 -->
        <div class="flex gap-2">
          <button 
            v-for="tool in tools" 
            :key="tool.id"
            @click="currentTool = tool.id"
            :class="[
              'p-2 rounded-lg transition-colors',
              currentTool === tool.id 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            ]"
            :title="tool.label"
            :disabled="disabled"
          >
            <span class="text-lg">{{ tool.icon }}</span>
          </button>
        </div>

        <!-- 分隔线 -->
        <div class="hidden md:block w-px h-8 bg-gray-300"></div>

        <!-- 笔色选择 -->
        <div class="relative">
          <button 
            @click="colorPickerOpen = !colorPickerOpen"
            class="p-2 rounded-lg border border-gray-300 flex items-center gap-2 hover:bg-gray-50"
            :disabled="disabled || currentTool === 'eraser'"
          >
            <span class="w-6 h-6 rounded border-2 border-gray-400" :style="{ backgroundColor: lineColor }"></span>
            <ChevronDown class="w-4 h-4" />
          </button>
          
          <div v-if="colorPickerOpen" class="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg p-3 z-10">
            <div class="flex flex-wrap gap-2">
              <button 
                v-for="color in presetColors"
                :key="color"
                @click="lineColor = color; colorPickerOpen = false"
                class="w-6 h-6 rounded border-2 transition-transform hover:scale-110"
                :class="lineColor === color ? 'border-indigo-600' : 'border-gray-300'"
                :style="{ backgroundColor: color }"
              />
            </div>
          </div>
        </div>

        <!-- 笔宽选择 -->
        <div class="flex gap-1">
          <button 
            v-for="size in availableBrushSizes"
            :key="size"
            @click="lineWidth = size"
            :class="[
              'w-8 h-8 rounded-lg border transition-colors',
              lineWidth === size 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            ]"
            :disabled="disabled || currentTool === 'eraser'"
            :title="`笔宽: ${size}`"
          >
            <span class="text-xs font-semibold">{{ size }}</span>
          </button>
        </div>

        <!-- 操作按钮 -->
        <div class="ml-auto flex gap-2">
          <button 
            @click="undo"
            class="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            :disabled="disabled || drawingHistory.length === 0"
            title="撤销"
          >
            <Undo2 class="w-5 h-5 text-gray-700" />
          </button>
          
          <button 
            @click="clear"
            class="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-red-600"
            :disabled="disabled"
            title="清空"
          >
            <Trash2 class="w-5 h-5" />
          </button>
          
          <button 
            @click="downloadImage"
            class="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            :disabled="disabled"
            title="下载"
          >
            <Download class="w-5 h-5 text-gray-700" />
          </button>

          <button 
            @click="saveDrawing"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            :disabled="disabled"
          >
            保存绘图
          </button>
        </div>
      </div>
    </div>

    <!-- Canvas -->
    <div class="bg-gray-50 p-4 overflow-auto" style="max-height: 700px;">
      <canvas 
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
        :class="['bg-white border-2 border-gray-300 cursor-crosshair', { 'opacity-50 cursor-not-allowed': disabled }]"
      ></canvas>
    </div>
  </div>
</template>

<style scoped>
canvas {
  display: block;
  margin: auto;
  user-select: none;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
