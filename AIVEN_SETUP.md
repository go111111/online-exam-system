# Aiven MySQL 配置指南

## 步骤 1️⃣：获取 Aiven MySQL 连接信息

### 在 Aiven Console 中：
1. 登录 https://console.aiven.io
2. 选择你的 MySQL 服务
3. 点击 **Databases** 标签
4. 找到 **defaultdb** 数据库
5. 点击 **Details** 获取连接信息

### 获取的信息应该包括：
```
Host: xxxxxxxx-xxxx.aivencloud.com
Port: 13206 (或其他端口)
Username: avnadmin
Password: xxxxxxxxxxxxxxxx
Database: defaultdb
```

---

## 步骤 2️⃣：在 DBeaver 中创建数据库表

### 创建新连接：
1. 打开 DBeaver
2. 右键点击 **Database** → **New Database Connection**
3. 选择 **MySQL**
4. 填入 Aiven 连接信息：
   - **Server Host**: `xxxxxxxx-xxxx.aivencloud.com`
   - **Port**: `13206`
   - **Database**: `defaultdb`
   - **Username**: `avnadmin`
   - **Password**: `你的密码`
5. 点击 **Test Connection** 验证连接

### 执行 SQL 脚本：
1. 连接成功后，打开 **SQL Editor**
2. 复制 [database.sql](./database.sql) 中的所有 SQL 语句
3. 粘贴到 DBeaver SQL Editor
4. 点击 **Execute** 按钮（或按 Ctrl+Enter）
5. 等待执行完成

---

## 步骤 3️⃣：配置项目 .env 文件

在项目根目录创建 `.env` 文件，复制以下内容并填入你的 Aiven 连接信息：

```bash
# MySQL - Aiven 连接配置
MYSQL_HOST=xxxxxxxx-xxxx.aivencloud.com
MYSQL_PORT=13206
MYSQL_USER=avnadmin
MYSQL_PASSWORD=你的密码
MYSQL_DATABASE=defaultdb

# JWT 密钥（生成一个强随机密钥）
JWT_SECRET=your-super-secret-key-min-32-characters-long

# Node 环境
NODE_ENV=development

# 其他配置（可选）
GEMINI_API_KEY=
APP_URL=http://localhost:3000
```

### 生成安全的 JWT_SECRET：
在 Node.js 中运行：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 步骤 4️⃣：验证配置

在项目目录运行：
```bash
npm run dev
```

应该看到：
```
✅ Connected to MySQL
Server running on http://localhost:3000
```

---

## 常见问题排查

### ❌ "Cannot authenticate user 'avnadmin'"
- 检查密码是否正确
- 确保 IP 白名单已添加（Aiven → Service Settings → IP Whitelist）

### ❌ "Access denied for user 'avnadmin'@'%'"
- 检查用户名和密码
- 确保数据库 defaultdb 已创建

### ❌ "Connection timeout"
- 检查主机名拼写
- 确保网络连接畅通
- 检查防火墙设置

---

## 默认管理员账户

注册后自动创建的默认管理员：
- **邮箱**: admin@example.com
- **密码**: 使用邮箱对应的授权码登录（这是使用 Aiven 的加密密码）
- **角色**: admin

---

## 下一步

1. ✅ 配置完成后，启动项目
2. ✅ 在浏览器打开 http://localhost:3000
3. ✅ 使用邮箱地址和授权码注册/登录
4. ✅ 开始使用在线考试系统！
