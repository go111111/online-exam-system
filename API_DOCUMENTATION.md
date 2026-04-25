# 在线考试系统 - API 文档

## 1. 用户认证 API

### 注册用户

- **路由**: `POST /api/register`
- **描述**: 用户注册新账户
- **请求体**:

```json
{
  "email": "user@qq.com",
  "password": "password123"
}
```

- **响应**:

```json
{
  "message": "User registered successfully"
}
```

- **前端对应**: `Register.vue` 页面

### 用户登录

- **路由**: `POST /api/login`
- **描述**: 用户登录，获取 JWT token
- **请求体**:

```json
{
  "email": "user@qq.com",
  "password": "password123"
}
```

- **响应**:

```json
{
  "token": "jwt_token_string",
  "user": {
    "id": 1,
    "email": "user@qq.com",
    "role": "admin" | "student"
  }
}
```

- **前端对应**: `Login.vue` 页面

## 2. 用户管理 API

### 获取当前用户信息

- **路由**: `GET /api/user/profile`
- **权限**: 需要认证 (token)
- **响应**:

```json
{
  "id": 1,
  "email": "user@qq.com",
  "full_name": "User Name",
  "role": "student" | "admin"
}
```

### 获取所有用户（管理员）

- **路由**: `GET /api/admin/users`
- **权限**: 需要管理员权限
- **响应**:

```json
[
  {
    "id": 1,
    "email": "admin@qq.com",
    "full_name": "Administrator",
    "role": "admin"
  },
  ...
]
```

## 3. 考试管理 API

### 获取用户可见的考试列表

- **路由**: `GET /api/exams`
- **权限**: 需要认证
- **响应**: 考试列表数组

### 获取考试详情（包含题目）

- **路由**: `GET /api/exams/:id`
- **权限**: 需要认证
- **响应**:

```json
{
  "exam": {
    "id": 1,
    "title": "Math Exam",
    "description": "...",
    "start_time": "2024-01-01T10:00:00Z",
    "end_time": "2024-01-01T11:30:00Z",
    "duration_minutes": 90,
    "status": "published"
  },
  "questions": [
    {
      "id": 1,
      "type": "choice" | "fill" | "text",
      "content": "Question content",
      "score": 5
    }
  ],
  "existingSubmission": null | { "id": 1, "status": "submitted" }
}
```

### 提交考试答案

- **路由**: `POST /api/exams/:id/submit`
- **权限**: 需要认证
- **请求体**:

```json
{
  "answers": {
    "1": "answer content",
    "2": "option A",
    ...
  },
  "cheated": false
}
```

- **响应**:

```json
{
  "id": 1
}
```

## 4. 管理员考试管理 API

### 获取管理员的所有考试

- **路由**: `GET /api/admin/exams`
- **权限**: 需要管理员权限
- **响应**: 考试列表

### 创建新考试

- **路由**: `POST /api/admin/exams`
- **权限**: 需要管理员权限
- **请求体**:

```json
{
  "title": "Exam Title",
  "description": "Exam description",
  "start_time": "2024-01-01T10:00:00Z",
  "end_time": "2024-01-01T11:30:00Z",
  "duration_minutes": 90,
  "status": "published" | "draft"
}
```

- **响应**:

```json
{
  "id": 1
}
```

### 更新考试

- **路由**: `PUT /api/admin/exams/:id`
- **权限**: 需要管理员权限
- **请求体**: 同创建考试
- **响应**:

```json
{
  "id": 1
}
```

### 删除考试

- **路由**: `DELETE /api/admin/exams/:id`
- **权限**: 需要管理员权限
- **响应**:

```json
{
  "success": true
}
```

## 5. 题目管理 API

### 获取考试的所有题目

- **路由**: `GET /api/admin/exams/:id/questions`
- **权限**: 需要管理员权限
- **响应**: 题目列表

### 添加新题目

- **路由**: `POST /api/admin/exams/:id/questions`
- **权限**: 需要管理员权限
- **请求体**:

```json
{
  "type": "choice" | "fill" | "text",
  "content": "Question content",
  "options": ["A", "B", "C", "D"],  // 仅选择题需要
  "answer": "A" | "correct answer text",
  "score": 5
}
```

- **响应**:

```json
{
  "id": 1
}
```

### 更新题目

- **路由**: `PUT /api/admin/exams/:examId/questions/:questionId`
- **权限**: 需要管理员权限
- **请求体**: 同添加题目
- **响应**:

```json
{
  "id": 1
}
```

### 删除题目

- **路由**: `DELETE /api/admin/exams/:examId/questions/:questionId`
- **权限**: 需要管理员权限
- **响应**:

```json
{
  "success": true
}
```

## 6. 成绩管理 API

### 获取所有提交的答卷

- **路由**: `GET /api/admin/results`
- **权限**: 需要管理员权限
- **响应**:

```json
[
  {
    "id": 1,
    "email": "student@qq.com",
    "examTitle": "Exam Name",
    "score": 85.5,
    "cheated": 0 | 1,
    "status": "submitted" | "graded" | "rejected"
  },
  ...
]
```

### 获取用户的所有提交

- **路由**: `GET /api/admin/users/:userId/submissions`
- **权限**: 需要管理员权限
- **响应**: 用户提交列表

### 获取提交详情

- **路由**: `GET /api/admin/submissions/:submissionId`
- **权限**: 需要管理员权限
- **响应**:

```json
{
  "submission": {
    "id": 1,
    "email": "student@qq.com",
    "examTitle": "Exam Name",
    "score": 85.5,
    "cheated": 0 | 1,
    "status": "submitted",
    "submitted_at": "2024-01-01T11:30:00Z"
  },
  "answers": [
    {
      "id": 1,
      "question_id": 1,
      "student_answer": "answer content",
      "content": "Question content",
      "correct_answer": "correct answer"
    },
    ...
  ]
}
```

## 7. 健康检查 API

### 检查服务器状态

- **路由**: `GET /api/health`
- **响应**:

```json
{
  "status": "ok",
  "database": "SQLite" | "MySQL"
}
```

## 前后端路由对应关系

| 前端路由                     | 对应组件              | 说明         |
| ---------------------------- | --------------------- | ------------ |
| `/login`                     | `Login.vue`           | 登录页面     |
| `/register`                  | `Register.vue`        | 注册页面     |
| `/`                          | `Dashboard.vue`       | 用户事务面板 |
| `/exam/:id`                  | `ExamSession.vue`     | 考试答题页面 |
| `/admin`                     | `AdminDashboard.vue`  | 管理员主面板 |
| `/admin/exams/:id/questions` | `QuestionManager.vue` | 题目管理页面 |
| `/admin/results`             | `AdminResults.vue`    | 成绩报告页面 |

## 管理员默认账户

- **邮箱**: `1776866817@qq.com`
- **密码**: `jungle123`
- **角色**: `admin`

## 前后端协调要点

### 1. 认证流程

1. 用户在 `Login.vue` 中输入邮箱和密码
2. 前端调用 `/api/login` 端点
3. 后端验证邮箱和密码，返回 token 和用户信息
4. 前端保存 token 到 localStorage，更新 auth 状态
5. 前端根据用户角色重定向到不同页面

### 2. 注册流程

1. 用户在 `Register.vue` 中填写邮箱和密码
2. 前端验证邮箱格式（QQ邮箱）和密码长度（6-20字符）
3. 前端调用 `/api/register` 端点
4. 后端创建新用户，返回成功消息
5. 前端重定向到登录页面

### 3. 数据验证

- **邮箱**: 必须是 QQ 邮箱格式（`^\d+@qq\.com$`）
- **密码**: 长度 6-20 个字符
- **角色**: `admin` 或 `student`

### 4. 错误处理

- 前端在捕获 API 错误时会显示 ElMessage 错误提示
- 后端返回 HTTP 状态码和 JSON 错误信息
- 常见错误：
  - 400: 请求参数无效
  - 401: 认证失败（邮箱/密码错误）
  - 403: 权限不足（非管理员）
  - 404: 资源不存在
  - 500: 服务器错误

### 5. 令牌管理

- 前端在每个请求的 `Authorization` 头中发送 token
- 格式: `Authorization: Bearer <token>`
- 后端验证 token 的有效性
