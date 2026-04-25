# 快速开始指南

## 系统要求

- Node.js 16+
- npm 或 yarn

## 项目设置

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 运行

## 登录信息

### 管理员账户（用于后台管理）

- **邮箱**: `1776866817@qq.com`
- **密码**: `jungle123`
- **访问地址**: http://localhost:3000/login → 登录后自动跳转 `/admin`

### 普通用户账户（用于考试）

- 可在 `/register` 页面注册新账户
- 需要使用 QQ 邮箱格式（例如：123456@qq.com）
- 密码长度：6-20 个字符

## 主要功能模块

### 前端路由

| 路由                         | 功能         | 权限           |
| ---------------------------- | ------------ | -------------- |
| `/login`                     | 用户登录     | 公开           |
| `/register`                  | 用户注册     | 公开           |
| `/`                          | 学生仪表盘   | 需要认证       |
| `/exam/:id`                  | 考试答题     | 需要认证       |
| `/admin`                     | 管理员主面板 | 需要管理员权限 |
| `/admin/exams/:id/questions` | 题目管理     | 需要管理员权限 |
| `/admin/results`             | 成绩查看     | 需要管理员权限 |

## 核心 API 端点

### 认证

- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录

### 考试管理（学生用户）

- `GET /api/exams` - 获取考试列表
- `GET /api/exams/:id` - 获取考试详情
- `POST /api/exams/:id/submit` - 提交答卷

### 管理后台（管理员）

- `GET /api/admin/exams` - 获取所有考试
- `POST /api/admin/exams` - 创建考试
- `PUT /api/admin/exams/:id` - 修改考试
- `DELETE /api/admin/exams/:id` - 删除考试
- `GET /api/admin/exams/:id/questions` - 获取题目列表
- `POST /api/admin/exams/:id/questions` - 添加题目
- `PUT /api/admin/exams/:id/questions/:qid` - 修改题目
- `DELETE /api/admin/exams/:id/questions/:qid` - 删除题目
- `GET /api/admin/results` - 获取所有提交结果

详细的 API 文档请参考 `API_DOCUMENTATION.md`

## 数据库

### 支持的数据库

- **默认**: SQLite (exam.db)
- **可选**: MySQL (需要配置 .env)

### 自动初始化

- 系统启动时自动创建所有数据库表
- 自动创建管理员账户

## 功能特点

### 登录页面 (Login.vue)

- ✅ Element Plus 表单组件
- ✅ QQ 邮箱验证
- ✅ 密码验证（6-20字符）
- ✅ 记住我功能
- ✅ 管理员演示账号提示
- ✅ 优雅的渐变设计

### 注册页面 (Register.vue)

- ✅ Element Plus 表单组件
- ✅ QQ 邮箱验证
- ✅ 密码确认验证
- ✅ 密码显示/隐藏切换
- ✅ 完整的表单验证
- ✅ 独特的 UI 设计

### 管理后台功能

- ✅ 考试创建和管理
- ✅ 题目管理（单选、填空、简答）
- ✅ 学生成绩查看
- ✅ 用户管理

### 学生功能

- ✅ 查看可用考试
- ✅ 在线答题
- ✅ 自动保存答卷状态
- ✅ 考试成绩查询

## 常见问题

### Q: 如何重置管理员密码？

A: 删除 `exam.db` 文件，重新启动服务器，系统会自动创建新的管理员账户。

### Q: 如何使用 MySQL 代替 SQLite？

A: 编辑 `.env` 文件，配置以下环境变量：

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=exam_system
```

### Q: 前端和后端是否需要分别启动？

A: 不需要。后端服务器会自动提供前端文件。只需运行 `npm run dev` 即可。

## 开发提示

### 项目结构

```
online-exam-system/
├── server.ts           # 后端服务器和 API
├── src/
│   ├── main.ts         # 前端入口
│   ├── views/
│   │   ├── Login.vue       # 登录页面
│   │   ├── Register.vue    # 注册页面
│   │   ├── Dashboard.vue   # 学生仪表盘
│   │   ├── ExamSession.vue # 考试页面
│   │   ├── AdminDashboard.vue # 管理后台
│   │   ├── QuestionManager.vue # 题目管理
│   │   └── AdminResults.vue    # 成绩查看
│   ├── App.vue         # 根组件
│   └── index.css       # 全局样式
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript 配置
└── vite.config.ts      # Vite 配置
```

### 修改验证规则

编辑 `Login.vue` 或 `Register.vue` 中的 `isValidQQEmail()` 和 `isValidPassword()` 函数。

### 添加新的 API 端点

在 `server.ts` 的 `startServer()` 函数中添加新的路由处理器。

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite
- **后端**: Express.js + TypeScript
- **数据库**: SQLite / MySQL
- **UI 框架**: Element Plus
- **样式**: Tailwind CSS
- **认证**: JWT
- **加密**: bcryptjs

## 许可证

MIT License
