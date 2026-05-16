# 在线考试系统

> 专业的考试管理和答题平台，支持在线考试、自动评分、手动批改、通知管理等功能。

## 功能特性

### 学生端
- 在线考试：支持单选题、多选题、填空题、简答题、绘图题
- 实时计时：考试倒计时功能
- 自动交卷：考试时间到自动提交
- 成绩查询：查看考试成绩和批改结果
- 通知中心：接收管理员发布的通知

### 管理员端
- 考试管理：创建、编辑、删除考试
- 题目管理：添加各种类型题目，支持图片上传
- 成绩管理：查看所有学生成绩
- 手动批改：对主观题进行手动评分
- 通知管理：发布系统通知，支持定向推送
- 用户管理：管理学生和管理员账号

## 技术栈

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 下一代前端构建工具
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Element Plus** - Vue 3 UI 组件库
- **Vue Router** - 官方路由管理器
- **Lucide Icons** - 精美的图标库

### 后端
- **Express.js** - Node.js Web 框架
- **TypeScript** - 类型安全的 JavaScript
- **MySQL / SQLite** - 数据库支持
- **JWT** - 身份认证
- **bcryptjs** - 密码加密
- **Multer** - 文件上传处理

## 项目结构

```
online-exam-system/
├── src/                          # 前端源代码
│   ├── components/               # 公共组件
│   │   ├── AdminSidebar.vue      # 管理员侧边栏
│   │   ├── AnswerSubmitter.vue   # 答题提交组件
│   │   ├── DrawingCanvas.vue     # 绘图画布组件
│   │   └── NotificationCenter.vue # 通知中心组件
│   ├── views/                    # 页面视图
│   │   ├── AdminDashboard.vue    # 管理员考试管理
│   │   ├── AdminGrading.vue      # 管理员批改页面
│   │   ├── AdminNotifications.vue # 管理员通知管理
│   │   ├── AdminResults.vue      # 管理员成绩管理
│   │   ├── Dashboard.vue         # 学生考试列表
│   │   ├── ExamSession.vue       # 考试页面
│   │   ├── Login.vue             # 登录页面
│   │   ├── QuestionManager.vue   # 题目管理
│   │   ├── Register.vue          # 注册页面
│   │   └── StudentResults.vue    # 学生成绩查询
│   ├── App.vue                   # 根组件
│   ├── main.ts                   # 入口文件
│   └── index.css                 # 全局样式
── server.ts                     # 后端服务器
├── uploads/                      # 文件上传目录
── .env                          # 环境变量配置
── package.json                  # 项目依赖
├── vite.config.ts                # Vite 配置
── tsconfig.json                 # TypeScript 配置
└── nginx.conf                    # Nginx 配置
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- MySQL 5.7+（可选，默认使用 SQLite）

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

主要配置项：

```env
# 数据库配置（可选，不配置则使用 SQLite）
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USER=exam-control
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=exam

# JWT 密钥（生产环境请修改）
JWT_SECRET=your_secret_key

# Vite 代理目标
VITE_API_PROXY_TARGET=http://localhost:3000
```

### 开发模式

```bash
# 启动开发服务器（前后端同时运行）
npm run dev

# 或单独启动前端
npm run client
```

访问：http://localhost:5173

### 默认管理员账号

- 邮箱：`1776866817@qq.com`
- 密码：`jungle123`

## 部署指南

### 本地开发部署

1. 安装依赖
```bash
npm install
```

2. 启动服务
```bash
npm run dev
```

### 宝塔面板部署

#### 方法一：使用 PM2 直接运行（推荐）

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 安装项目依赖
npm install --production

# 3. 启动服务
pm2 start "npx tsx server.ts" --name online-exam-system

# 4. 保存配置
pm2 save
pm2 startup
```

#### 方法二：编译后运行

```bash
# 1. 安装所有依赖
npm install

# 2. 编译 TypeScript
npm run build:server

# 3. 启动编译后的文件
pm2 start dist/server.js --name online-exam-system
pm2 save
```

#### 配置 Nginx 反向代理

在宝塔面板中配置反向代理：

```nginx
location /api {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

### Docker 部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## API 接口

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/register | 用户注册 |
| POST | /api/login | 用户登录 |

### 考试接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/exams | 获取考试列表 |
| GET | /api/exams/:id | 获取考试详情 |
| POST | /api/exams/:id/submit | 提交考试答案 |

### 管理员接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/exams | 获取考试列表 |
| POST | /api/admin/exams | 创建考试 |
| PUT | /api/admin/exams/:id | 更新考试 |
| DELETE | /api/admin/exams/:id | 删除考试 |
| GET | /api/admin/exams/:id/questions | 获取题目列表 |
| POST | /api/admin/exams/:id/questions | 添加题目 |
| GET | /api/admin/notifications | 获取通知列表 |
| POST | /api/admin/notifications | 发布通知 |
| DELETE | /api/admin/notifications/:id | 删除通知 |
| GET | /api/admin/grading/submissions | 获取待批改列表 |
| PUT | /api/admin/submissions/:id/grade | 批改试卷 |

### 通知接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/notifications | 获取用户通知 |
| GET | /api/notifications/unread/count | 获取未读数量 |
| PUT | /api/notifications/:id/read | 标记为已读 |

## 数据库

### 支持的数据库

- **SQLite**（默认）：适合开发和小型部署
- **MySQL**：适合生产环境

### 数据表结构

- `users` - 用户表
- `exams` - 考试表
- `questions` - 题目表
- `question_options` - 题目选项表
- `submissions` - 提交记录表
- `answers` - 答案表
- `notifications` - 通知表
- `notification_reads` - 通知已读记录表

## 常见问题

### 1. 502 Bad Gateway 错误

**原因**：后端服务未运行

**解决**：
```bash
# 检查服务是否运行
curl http://127.0.0.1:3000/api/health

# 启动服务
pm2 start "npx tsx server.ts" --name online-exam-system
```

### 2. 数据库连接失败

**原因**：MySQL 配置错误或 MySQL 未安装

**解决**：系统会自动降级使用 SQLite，无需额外配置

### 3. 端口被占用

**解决**：
```bash
# 查看端口占用
netstat -tunlp | grep 3000

# 杀死占用进程
kill -9 <PID>
```

### 4. 文件上传失败

**解决**：确保 `uploads` 目录存在且有写入权限
```bash
mkdir -p uploads
chmod 755 uploads
```

## 开发说明

### 代码规范

- 使用 TypeScript 编写所有代码
- 遵循 ESLint 规范
- 组件使用 `<script setup>` 语法

### 提交代码

```bash
# 检查类型错误
npm run lint

# 构建前端
npm run build
```

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：

- Email: 1776866817@qq.com

---

**注意**：生产环境部署时，请务必修改 `.env` 文件中的 `JWT_SECRET` 为强密钥！
