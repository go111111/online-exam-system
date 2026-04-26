# 画图题功能快速部署指南

## 📋 快速检查清单

### 1. 数据库更新（必需）

#### MySQL 用户

```bash
# 执行数据库脚本
mysql -h localhost -u root -p your_database < add_drawing_support.sql

# 或使用 mysql client 手动执行脚本内容
```

#### SQLite 用户

- 自动创建，无需操作

### 2. 安装依赖

```bash
cd your-project-path
npm install multer
```

### 3. 文件系统准备

确保 `uploads/` 目录存在，且有写入权限：

```bash
mkdir -p uploads
chmod 755 uploads
```

### 4. 验证部署

#### 启动服务

```bash
npm run dev
```

#### 测试绘图题API

```bash
# 创建绘图题
curl -X POST http://localhost:3000/api/admin/exams/1/questions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "drawing",
    "content": "请绘制一个圆形",
    "score": 10
  }'

# 上传答案
curl -X POST http://localhost:3000/api/exams/1/submit-answer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "questionId=1" \
  -F "file=@/path/to/image.png"
```

---

## 🎨 功能演示

### 后台管理界面变化

#### 题目管理页面

- **新增项**：题目类型选择器（包含绘图题选项）
- **题目标签**：绘图题显示为紫色标签
- **表单变化**：绘图题不需要填写标准答案

```
[题目类型] ▼
├─ 单选题
├─ 填空题
├─ 简答题
└─ 绘图题 ✨ （新增）
```

### 学生答题界面变化

#### 绘图题渲染

- **题目标签**：显示"绘图题"且使用紫色
- **两个选项卡**：
  1. 📐 在线绘制 - Canvas绘图工具
  2. 📤 上传图片 - 文件上传区

#### 绘图工具栏

- ✏️ 画笔
- 🧹 橡皮
- 📏 直线
- ◻️ 矩形
- ⭕ 圆形

#### 颜色和笔宽

- 预设颜色：黑、红、绿、蓝、橙、紫、青
- 笔宽：1, 2, 3, 5, 8

#### 操作按钮

- ↩️ 撤销
- 🗑️ 清空
- ⬇️ 下载
- 💾 保存绘图

---

## 📁 文件结构

### 新增文件

```
src/
├─ components/
│  ├─ DrawingCanvas.vue      ✨ 绘图工具组件
│  └─ AnswerSubmitter.vue    ✨ 答题提交组件（支持绘图）
└─ views/
   └─ ExamSession.vue        ✏️ 更新：集成绘图题

根目录/
├─ add_drawing_support.sql    ✨ 数据库脚本
├─ DRAWING_FEATURE_GUIDE.md   ✨ 完整功能文档
└─ uploads/                   ✨ 文件上传目录

server.ts                      ✏️ 更新：添加文件上传API
```

### 修改文件

```
package.json                   ✏️ 添加 multer 依赖
server.ts                      ✏️ 添加文件上传处理
src/views/QuestionManager.vue ✏️ 支持绘图题管理
src/views/ExamSession.vue    ✏️ 支持绘图题答题
```

---

## 🔧 API 快速参考

### 题目管理

**添加绘图题**

```
POST /api/admin/exams/:id/questions
{
  "type": "drawing",
  "content": "题目内容",
  "score": 10
}
```

**编辑绘图题**

```
PUT /api/admin/exams/:id/questions/:qid
{
  "type": "drawing",
  "content": "题目内容",
  "score": 10
}
```

### 答题

**上传图片答案**

```
POST /api/exams/:id/submit-answer
Content-Type: multipart/form-data

questionId: 123
file: <binary>
```

**提交Canvas绘图**

```
POST /api/exams/:id/submit-answer
Content-Type: multipart/form-data

questionId: 123
drawingData: '{"width":600,"height":400,"imageData":"..."}'
```

**获取答案（含附件）**

```
GET /api/exams/:id/submission/answers
```

**获取上传的文件**

```
GET /api/uploads/:filename
```

---

## 🐛 常见问题

### Q: 上传文件失败？

**A:** 检查以下项：

- uploads 目录存在且可写
- 文件大小 < 10MB
- 文件格式是图片（image/\*)

### Q: Canvas绘图保存不了？

**A:**

- 检查浏览器是否支持Canvas API
- 检查浏览器控制台错误
- 确认JSON序列化正常

### Q: 绘图题未显示？

**A:**

- 确认数据库字段更新
- 检查前端组件导入
- 重新启动开发服务

### Q: 上传的文件在哪？

**A:** 在 `./uploads/` 目录下，文件名格式为 `{时间戳}-{随机数}.{扩展名}`

---

## 📊 技术细节

### Canvas 绘图数据结构

```json
{
  "width": 600,
  "height": 400,
  "imageData": "data:image/png;base64,iVBORw0KGgo..."
}
```

### 文件上传验证

- MIME 类型：`image/*`
- 大小限制：10MB
- 存储位置：`uploads/` 目录

### 数据库字段

```sql
-- answers 表新增字段
answer_image_path VARCHAR(500)     -- 图片路径
answer_image_base64 LONGTEXT       -- Base64数据
submission_type ENUM('text','file','canvas') -- 提交类型

-- 新增表
answer_files (file_name, file_path, file_size, file_type)
drawing_data (answer_id, canvas_json)
```

---

## ✅ 测试清单

- [ ] 数据库表已创建
- [ ] multer 已安装
- [ ] uploads 目录已创建
- [ ] 服务器启动无错误
- [ ] 可以添加绘图题
- [ ] 可以编辑绘图题
- [ ] 学生可以在线绘图
- [ ] 学生可以上传图片
- [ ] 管理员可以查看答案

---

## 🚀 性能建议

1. **文件大小**：建议限制为 5-10MB
2. **Canvas 分辨率**：建议 600x400 以上
3. **绘图历史**：保留最近 20 步（可配置）
4. **数据库索引**：为 `answer_files` 和 `drawing_data` 添加索引

```sql
CREATE INDEX idx_answer_files_answer_id ON answer_files(answer_id);
CREATE INDEX idx_drawing_data_answer_id ON drawing_data(answer_id);
```

---

## 🔐 安全建议

1. **验证权限**：确保用户只能上传自己的答案
2. **文件验证**：使用 Magic Numbers 验证文件类型
3. **路径安全**：防止目录遍历攻击
4. **配额管理**：限制用户上传总大小
5. **病毒扫描**：生产环境建议集成病毒扫描

---

## 📞 支持

如遇问题，查阅：

- `DRAWING_FEATURE_GUIDE.md` - 完整功能文档
- `API_DOCUMENTATION.md` - API详细说明
- `server.ts` - 后端实现代码
- 组件源代码 - 前端实现细节
