# 画图题与图片上传功能集成指南

## 功能概述

本文档说明新增的画图题类型和图片文件上传答案功能。

### 新增功能

1. **绘图题（Drawing）**：学生可以在线绘制答案或上传图片
2. **文件上传**：支持学生上传答案图片文件
3. **绘图数据存储**：保存Canvas绘图数据用于后续评分

---

## 数据库更新

### 需要执行的SQL脚本

见文件：`add_drawing_support.sql`

主要变更：

- 修改 `questions` 表的 `question_type` 字段，支持 `drawing` 类型
- 添加 `answer_files` 表存储上传的文件信息
- 添加 `drawing_data` 表存储Canvas绘图数据
- 在 `answers` 表中添加新列：
  - `answer_image_path`：答案图片路径
  - `answer_image_base64`：Base64格式图片数据
  - `submission_type`：提交类型（text/file/canvas）

### SQLite自动创建

SQLite数据库会自动创建所需的新表。如使用MySQL，需手动执行SQL脚本。

---

## API 接口说明

### 1. 题目管理API

#### 添加题目（支持绘图题）

```
POST /api/admin/exams/:id/questions
```

**请求体**：

```json
{
  "type": "drawing",
  "content": "请绘制一个圆形",
  "score": 10,
  "answer": ""
}
```

**说明**：

- 绘图题的 `answer` 字段不需要填写（为空字符串）
- 其他题目类型保持原有逻辑

#### 修改题目（支持绘图题）

```
PUT /api/admin/exams/:id/questions/:qid
```

相同的请求体格式。

### 2. 答题提交API

#### 提交单个答案（文件上传）

```
POST /api/exams/:id/submit-answer
Content-Type: multipart/form-data
```

**请求参数**：

- `questionId`: 题目ID（必需）
- `answerText`: 文本答案（可选）
- `file`: 上传的图片文件（可选，仅对绘图题）
- `drawingData`: Canvas绘图数据JSON字符串（可选）

**响应**：

```json
{
  "id": 123,
  "submissionId": 456
}
```

**说明**：

- 该API支持三种提交方式：纯文本、上传图片、Canvas绘图
- Canvas数据格式：
  ```json
  {
    "width": 600,
    "height": 400,
    "imageData": "data:image/png;base64,..."
  }
  ```

#### 获取提交答案（含文件和绘图数据）

```
GET /api/exams/:id/submission/answers
```

**响应**：

```json
[
  {
    "id": 1,
    "question_id": 101,
    "student_answer": "答案文本",
    "submission_type": "canvas",
    "answer_image_path": null,
    "files": [
      {
        "id": 1,
        "file_name": "answer.png",
        "file_path": "uploads/1234567890-123.png",
        "file_size": 5242880
      }
    ],
    "drawing": "{\"width\":600,\"height\":400,...}"
  }
]
```

#### 获取上传的文件

```
GET /api/uploads/:filename
```

**说明**：

- 返回实际的文件内容
- 文件存储在 `uploads/` 目录
- 包含安全检查，防止目录遍历攻击

### 3. 原有API变更

#### 提交试卷

```
POST /api/exams/:id/submit
```

**说明**：

- 保持向后兼容
- 仅用于提交文本类答案
- 绘图题需使用 `/submit-answer` 端点单独提交

---

## 前端组件

### 1. DrawingCanvas.vue

**功能**：在线绘图工具

**属性**：

- `modelValue`: string - 保存的绘图数据
- `canvasWidth`: number - 画布宽度（默认800）
- `canvasHeight`: number - 画布高度（默认600）
- `disabled`: boolean - 是否禁用

**事件**：

- `update:modelValue`: 更新绘图数据
- `save`: 保存绘图

**特性**：

- 多种绘图工具：画笔、橡皮、直线、矩形、圆形
- 颜色选择器
- 笔宽调整（1-8）
- 撤销功能（保存绘图历史）
- 清空画布
- 下载图片

### 2. AnswerSubmitter.vue

**功能**：答题提交组件（支持文本、文件、绘图）

**属性**：

- `questionId`: number - 题目ID
- `questionType`: 'choice' | 'fill' | 'text' | 'drawing' - 题目类型
- `disabled`: boolean - 是否禁用

**事件**：

- `submit-answer`: 提交答案
  ```typescript
  {
    questionId: number,
    answerText?: string,
    file?: File,
    drawingData?: string,
    submissionType: 'text' | 'file' | 'canvas'
  }
  ```

### 3. QuestionManager.vue 更新

**新增功能**：

- 题目类型选择器，包含绘图题选项
- 为绘图题隐藏答案输入框
- 题目类型标签样式优化（使用不同颜色）

### 4. ExamSession.vue 更新

**新增功能**：

- 集成 `AnswerSubmitter` 组件处理绘图题
- 支持单个题目异步提交（使用 `/submit-answer`）
- 显示提交状态反馈
- 绘图题题目标签显示（紫色）

---

## 文件上传配置

### 上传限制

- **最大文件大小**：10MB
- **允许格式**：image/\* (PNG, JPG, GIF等)
- **存储目录**：`./uploads/`

### 文件名生成

- 使用时间戳和随机数生成唯一文件名
- 保留原始扩展名
- 格式：`{timestamp}-{random}.{ext}`

### 安全措施

- MIME类型检查
- 文件大小验证
- 目录遍历防护（`/api/uploads/:filename`）
- 文件路径验证

---

## 数据库迁移步骤

### MySQL 用户

1. 备份现有数据
2. 执行 `add_drawing_support.sql` 脚本
3. 验证表结构

```bash
# 连接到数据库
mysql -h localhost -u root -p exam_db < add_drawing_support.sql
```

### SQLite 用户

自动创建，无需手动操作。

---

## 使用流程

### 管理员创建绘图题

1. 进入题目管理页面
2. 点击"添加题目"
3. 选择题目类型为"绘图题"
4. 输入题目内容和分数
5. 点击保存

### 学生答题

1. 打开考试
2. 对于绘图题，有两个选项：
   - **在线绘制**：使用Canvas绘图工具
   - **上传图片**：上传准备好的图片文件
3. 点击"提交答案"保存
4. 最后提交整份试卷

### 管理员评分

1. 进入评卷页面
2. 对绘图题进行查看和手动评分
3. 输入得分和评论

---

## 集成检查清单

- [ ] 数据库表已创建/更新
- [ ] 后端依赖已安装 (`npm install multer`)
- [ ] 文件上传目录已创建 (`./uploads/`)
- [ ] 前端组件已导入
- [ ] API端点已测试
- [ ] 文件权限已配置
- [ ] 生产环境部署配置

---

## 故障排除

### 文件上传失败

- 检查 `uploads/` 目录权限
- 确认文件大小不超过10MB
- 验证文件格式为图片类型

### Canvas数据丢失

- 确保浏览器支持 Canvas API
- 检查 JSON 序列化/反序列化

### 绘图题未显示

- 确认数据库 `question_type` 为 'drawing'
- 检查前端组件导入

---

## 扩展功能建议

1. **图片编辑**：添加图片注释功能
2. **OCR识别**：自动识别绘图内容
3. **对比工具**：展示参考答案和学生答案对比
4. **评分模板**：创建绘图题评分标准模板
5. **导出功能**：导出绘图答案为PDF

---

## 技术细节

### Canvas 绘图数据格式

```typescript
interface DrawingData {
  width: number; // 画布宽度
  height: number; // 画布高度
  imageData: string; // Base64编码的PNG图片数据
}
```

### 文件存储结构

```
uploads/
├── 1234567890-123.png
├── 1234567891-456.jpg
└── ...
```

### 数据库关系

```
submissions (1) ──── (N) answers
                     │
                     ├── (1) answer_files
                     └── (1) drawing_data
```

---

## 版本信息

- 更新日期：2026年4月26日
- 支持的浏览器：Chrome, Firefox, Safari, Edge（需要Canvas API支持）
- 后端框架：Express.js
- 前端框架：Vue 3
