# Login System Verification Checklist ✅

**Last Updated:** April 24, 2026

---

## 🔍 前后端接口匹配状态

### ✅ 数据格式验证

#### POST /api/login

| 层级         | 字段       | 前端发送   | 后端期望   | 状态    |
| ------------ | ---------- | ---------- | ---------- | ------- |
| Request Body | 邮箱字段   | `email`    | `email`    | ✅ 匹配 |
| Request Body | 密码字段   | `password` | `password` | ✅ 匹配 |
| Response     | token      | 返回       | 接收       | ✅ 匹配 |
| Response     | user.id    | 返回       | 存储       | ✅ 匹配 |
| Response     | user.email | 返回       | 存储       | ✅ 匹配 |
| Response     | user.role  | 返回       | 存储       | ✅ 匹配 |

#### POST /api/register

| 层级         | 字段     | 前端发送     | 后端期望   | 状态    |
| ------------ | -------- | ------------ | ---------- | ------- |
| Request Body | 邮箱字段 | `email`      | `email`    | ✅ 匹配 |
| Request Body | 密码字段 | `password`   | `password` | ✅ 匹配 |
| Response     | message  | 接收成功消息 | 返回消息   | ✅ 匹配 |

---

## 📋 验证规则检查

### 前端验证 (src/views/Login.vue)

```typescript
✅ QQ邮箱格式: /^[0-9]+@qq\.com$/
✅ 密码长度: 6-20 字符
✅ 邮箱小写转换: email.toLowerCase()
✅ 加载状态: loading.value
✅ 错误处理: error.value
```

### 后端验证 (server.ts)

#### 注册接口

```typescript
✅ 检查邮箱和密码非空
✅ QQ邮箱格式验证: /^[0-9]+@qq\.com$/
✅ 密码长度验证: 6-20 字符
✅ 邮箱小写存储: email.toLowerCase()
✅ 密码加密: bcryptjs (10轮)
✅ 重复邮箱检查: UNIQUE constraint
✅ 默认角色: 'student'
```

#### 登录接口

```typescript
✅ 检查邮箱和密码非空
✅ 邮箱小写查询: email.toLowerCase()
✅ 密码验证: bcrypt.compareSync()
✅ JWT签名: { id, email, role }
✅ 响应格式: { token, user: { id, email, role } }
```

---

## 🧪 数据流验证图

```
┌─ 用户输入 (Login.vue)
│  ├─ email: "123456@qq.com"
│  └─ password: "password123"
│
├─ 前端验证
│  ├─ isValidQQEmail() ✅
│  └─ isValidPassword() ✅
│
├─ 发送请求 (api.post)
│  ├─ URL: /api/login
│  ├─ Headers: { Authorization: "Bearer {token}" }
│  └─ Body: { email, password }
│
├─ 后端处理 (server.ts)
│  ├─ 验证邮箱和密码非空 ✅
│  ├─ 查询用户: SELECT * FROM users WHERE email = ?
│  ├─ bcrypt密码比对 ✅
│  └─ 生成JWT Token ✅
│
├─ 响应格式
│  ├─ token: "eyJhbGc..."
│  └─ user: { id: 1, email: "123456@qq.com", role: "student" }
│
└─ 前端处理 (main.ts auth.login)
   ├─ 存储user到localStorage ✅
   ├─ 存储token到localStorage ✅
   ├─ 设置headers.Authorization = "Bearer {token}" ✅
   └─ 路由跳转 (admin或/) ✅
```

---

## 🚀 快速测试步骤

### 1. 启动服务器

```bash
npm run dev
```

### 2. 访问登录页

```
http://localhost:3000/login
```

### 3. 测试注册

- **邮箱:** `testuser@qq.com` (必须是QQ邮箱)
- **密码:** `password123` (6-20字符)
- **预期:** 弹出"Registered successfully"

### 4. 测试登录

- **邮箱:** `testuser@qq.com`
- **密码:** `password123`
- **预期:**
  - 导航栏显示: `testuser@qq.com`
  - 路由跳转到: `/` (首页)
  - localStorage保存token和user

### 5. 测试验证规则

#### 邮箱验证失败

| 输入               | 预期错误                                    |
| ------------------ | ------------------------------------------- |
| `invalid`          | "Please use QQ email (e.g., 123456@qq.com)" |
| `123456@gmail.com` | "Please use QQ email (e.g., 123456@qq.com)" |
| `123456@163.com`   | "Please use QQ email (e.g., 123456@qq.com)" |
| `123456@qq.com`    | ✅ 通过                                     |
| `999999@qq.com`    | ✅ 通过                                     |

#### 密码验证失败

| 输入                             | 预期错误                           |
| -------------------------------- | ---------------------------------- |
| `12345`                          | "Password must be 6-20 characters" |
| `12345678901234567890a` (21char) | "Password must be 6-20 characters" |
| `123456`                         | ✅ 通过                            |
| `password123`                    | ✅ 通过                            |

### 6. 测试管理员登录

- **邮箱:** `admin@qq.com`
- **密码:** `admin123`
- **预期:**
  - 导航栏显示: `admin@qq.com`
  - 路由跳转到: `/admin`
  - "后台管理"链接可见

---

## 🔗 接口请求/响应示例

### 登录成功示例

**Request:**

```json
POST /api/login
Content-Type: application/json

{
  "email": "testuser@qq.com",
  "password": "password123"
}
```

**Response (200 OK):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "email": "testuser@qq.com",
    "role": "student"
  }
}
```

### 登录失败示例 (错误邮箱)

**Request:**

```json
POST /api/login
Content-Type: application/json

{
  "email": "testuser@qq.com",
  "password": "wrongpassword"
}
```

**Response (401 Unauthorized):**

```json
{
  "error": "Invalid email or password"
}
```

### 注册成功示例

**Request:**

```json
POST /api/register
Content-Type: application/json

{
  "email": "newuser@qq.com",
  "password": "password123"
}
```

**Response (200 OK):**

```json
{
  "message": "User registered successfully"
}
```

### 注册验证失败示例 (格式错误)

**Request:**

```json
POST /api/register
Content-Type: application/json

{
  "email": "notqq@gmail.com",
  "password": "password123"
}
```

**Response (400 Bad Request):**

```json
{
  "error": "Please use QQ email (xxx@qq.com)"
}
```

---

## 📱 localStorage数据结构

### 登录后 localStorage 内容

```json
// localStorage.getItem('user')
{
  "id": 2,
  "email": "testuser@qq.com",
  "role": "student"
}

// localStorage.getItem('token')
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 请求头示例

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

## 🐛 常见问题排查

### 问题1: "Invalid email or password" 错误

**可能原因:**

- [ ] 邮箱输入错误
- [ ] 密码输入错误
- [ ] 用户未注册
- [ ] 数据库连接失败

**排查步骤:**

1. 检查控制台日志
2. 确认用户在数据库中: `SELECT * FROM users WHERE email = ?`
3. 测试默认管理员: `admin@qq.com` / `admin123`

### 问题2: "Please use QQ email" 错误

**可能原因:**

- [ ] 输入不是QQ邮箱格式
- [ ] 邮箱有空格或特殊字符

**解决:** 使用格式 `qqnumber@qq.com`

### 问题3: "Password must be 6-20 characters" 错误

**可能原因:**

- [ ] 密码少于6个字符
- [ ] 密码超过20个字符

**解决:** 使用6-20个字符的密码

### 问题4: 网络请求失败 (no response)

**可能原因:**

- [ ] 后端服务未启动
- [ ] 端口3000被占用
- [ ] CORS配置问题
- [ ] 网络连接问题

**排查步骤:**

1. 确认后端运行: `npm run dev`
2. 检查浏览器控制台 Network 标签
3. 检查服务器日志输出

### 问题5: 登录成功但无法跳转到首页

**可能原因:**

- [ ] Token保存失败
- [ ] 路由配置问题
- [ ] 用户登录状态未正确设置

**排查步骤:**

1. 打开浏览器DevTools
2. 检查 Application > localStorage
3. 验证 `user` 和 `token` 已保存
4. 检查控制台错误信息

---

## ✨ 最后验证清单

- [ ] `npm install` 已执行（确保dependencies安装）
- [ ] 数据库已初始化 (MySQL 或 SQLite)
- [ ] 后端服务运行正常 (port 3000)
- [ ] 前端能访问后端接口
- [ ] QQ邮箱验证规则生效
- [ ] 密码长度验证规则生效
- [ ] 登录成功后token保存
- [ ] 用户信息正确显示在导航栏
- [ ] 管理员/学生路由正确跳转
- [ ] localStorage中user和token正确存储

---

**状态:** ✅ 前后端接口完全对接
**最后修复时间:** April 24, 2026
