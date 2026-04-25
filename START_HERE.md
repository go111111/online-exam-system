# 在线考试系统 - 一页纸开始指南

## 🚀 3分钟快速启动

```bash
# 1️⃣ 安装依赖
npm install

# 2️⃣ 启动服务
npm run dev

# 3️⃣ 打开浏览器
http://localhost:3000/login

# 4️⃣ 使用默认管理员登录
📧 admin@qq.com
🔐 admin123
```

**就这样！** 无需配置，自动使用 SQLite 本地数据库。

---

## 🔧 完整配置（需要时）

### 方法A：交互式配置向导（推荐）

**Windows:**

```bash
setup-config.bat
```

**Mac/Linux:**

```bash
node setup-wizard.js
```

### 方法B：手动配置

编辑 `.env` 文件：

```env
# 仅需要这三项就能运行
JWT_SECRET=你生成的密钥或任意32+字符
NODE_ENV=development
APP_URL=http://localhost:3000
```

生成JWT密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📦 配置方案对比

| 方案                | 安装易度 | 功能     | 推荐场景              |
| ------------------- | -------- | -------- | --------------------- |
| **SQLite** (默认)   | ⭐       | 单机开发 | ✅ 快速测试、本地开发 |
| **本地MySQL**       | ⭐⭐⭐   | 多人协作 | ✅ 团队测试           |
| **云MySQL** (Aiven) | ⭐⭐     | 生产部署 | ✅ 线上部署           |

---

## 🎯 三种场景配置

### 1️⃣ 快速测试（最简单）

```bash
npm install
npm run dev
# 完成！访问 http://localhost:3000/login
```

### 2️⃣ 团队协作（需要MySQL）

**Windows:**

```bash
# 运行配置向导
setup-config.bat
# 选择选项 2 (本地 MySQL)，按提示输入
```

**Mac/Linux:**

```bash
node setup-wizard.js
# 选择选项 2，按提示输入
```

### 3️⃣ 生产部署（使用云MySQL）

编辑 `.env`：

```env
MYSQL_HOST=your-cloud-host
MYSQL_PORT=3306
MYSQL_USER=your-user
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=your-database
JWT_SECRET=生成的安全密钥
NODE_ENV=production
APP_URL=https://your-domain.com
```

---

## 📖 详细文档

| 文档                          | 内容                           |
| ----------------------------- | ------------------------------ |
| **QUICK_CONFIGURE.md**        | 快速参考表、常见错误、最佳实践 |
| **CONFIGURATION_GUIDE.md**    | 完整配置说明、所有选项详解     |
| **VERIFICATION_CHECKLIST.md** | 测试清单、故障排除             |
| **FIXES_SUMMARY.md**          | 登录系统修复说明               |

---

## 🔑 关键配置项

### 必填项

| 项           | 说明                  | 示例              |
| ------------ | --------------------- | ----------------- |
| `JWT_SECRET` | 登录令牌密钥，32+字符 | `abc123def456...` |

### 数据库配置（可选，留空用SQLite）

| 项               | 说明       | 示例          |
| ---------------- | ---------- | ------------- |
| `MYSQL_HOST`     | 数据库地址 | `localhost`   |
| `MYSQL_PORT`     | 数据库端口 | `3306`        |
| `MYSQL_USER`     | 数据库用户 | `root`        |
| `MYSQL_PASSWORD` | 数据库密码 | `password123` |
| `MYSQL_DATABASE` | 数据库名   | `exam_system` |

### 应用配置（可选）

| 项                | 说明       | 默认值                  |
| ----------------- | ---------- | ----------------------- |
| `NODE_ENV`        | 运行环境   | `development`           |
| `APP_URL`         | 应用地址   | `http://localhost:3000` |
| `GEMINI_API_KEY`  | AI功能密钥 | 留空                    |
| `EMAIL_SENDER`    | 邮箱地址   | 留空                    |
| `EMAIL_AUTH_CODE` | 邮箱授权码 | 留空                    |

---

## 🆘 常见问题秒解

| 问题         | 解决                                       |
| ------------ | ------------------------------------------ |
| 无法启动     | `npm install` 重新安装依赖                 |
| 端口被占用   | 改 server.ts 中的 PORT，或 `kill` 占用进程 |
| 登录失败     | 邮箱必须是 QQ 邮箱 (xxx@qq.com)            |
| MySQL 不连接 | 自动降级为 SQLite，继续正常运行            |
| 看不到数据   | SQLite 数据存在 `exam.db` 文件中           |

---

## ✅ 启动检查清单

启动前确保：

- [ ] `npm install` 已执行
- [ ] `.env` 文件存在（或留空用SQLite）
- [ ] Node.js 版本 >= 16（`node --version`）
- [ ] 端口 3000 未被占用

启动后：

- [ ] 看到 `✓ Connected to MySQL` 或 `⚠️ Using SQLite`
- [ ] 浏览器能访问 `http://localhost:3000`
- [ ] 能用 `admin@qq.com` / `admin123` 登录
- [ ] 导航栏显示 `admin@qq.com`

---

## 📞 获取帮助

1. **查看详细文档:** `CONFIGURATION_GUIDE.md`
2. **查看快速参考:** `QUICK_CONFIGURE.md`
3. **查看测试指南:** `VERIFICATION_CHECKLIST.md`
4. **查看日志输出:** 服务启动时的控制台日志
5. **检查 .env 文件:** 配置是否正确

---

## 🎓 学习路径

```
新手 → 快速启动 (3分钟)
    ↓
有问题 → 查看常见问题
    ↓
需要配置 → 运行配置向导
    ↓
深入了解 → 阅读完整配置指南
    ↓
开始开发 → 查看项目结构和API文档
```

---

## 📊 系统状态

```
✅ 登录系统     - 支持 QQ 邮箱 + 密码 (6-20字符)
✅ 数据库      - SQLite 和 MySQL 双支持
✅ JWT 认证    - 自动生成和验证令牌
✅ 用户管理    - 默认管理员（admin@qq.com / admin123）
✅ 路由保护    - 自动重定向未授权用户
```

---

**最后更新:** April 24, 2026  
**状态:** ✅ 系统就绪，可以开始使用

---

## 快速命令参考

```bash
# 开发
npm run dev           # 启动开发服务器
npm run build         # 构建生产版本
npm run lint          # TypeScript 检查

# 配置
node setup-wizard.js  # (Mac/Linux) 交互式配置
setup-config.bat      # (Windows) 交互式配置
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # 生成JWT密钥

# 数据库（如果使用MySQL）
mysql -u user -p db < database.sql  # 导入数据库结构

# 测试
test-api.bat          # API 接口测试
curl http://localhost:3000/api/health  # 检查服务器
```

**现在就开始吧！** 🚀
