# Aiven MySQL 配置指南

## 步骤 1: 获取 Aiven 凭证

### 如果你已经有 Aiven 项目和 MySQL 实例：

1. 登录 [Aiven console](https://console.aiven.io)
2. 找到你的 MySQL 服务
3. 点击 "Connection information" 或 "Overview"
4. 找到连接信息，包括：
   - **Host**: aivencloud.com 域名（如 `my-db.aivencloud.com`）
   - **Port**: 通常是 3306
   - **Username**: 数据库用户名
   - **Password**: 数据库密码
   - **Database**: 数据库名称

### 如果你还没有创建 Aiven MySQL 实例：

1. 访问 [Aiven.io](https://aiven.io)
2. 注册或登录
3. 创建新项目
4. 选择 "MySQL" 服务
5. 选择地区和配置（免费套餐可用）
6. 等待服务创建完成（通常 2-3 分钟）
7. 从服务详情页获取连接信息

## 步骤 2: 填充 .env 文件

编辑项目根目录的 `.env` 文件，填入你的 Aiven 凭证：

```bash
# MySQL Configuration (Aiven)
MYSQL_HOST=your-aiven-host.aivencloud.com
MYSQL_PORT=3306
MYSQL_USER=avnadmin
MYSQL_PASSWORD=your-aiven-password
MYSQL_DATABASE=your_database_name

# JWT Secret (for authentication)
JWT_SECRET=your-secret-key-here-min-32-chars-recommended

# Environment
NODE_ENV=development
APP_URL=http://localhost:3000
```

**重要**: 不要使用 `avnadmin` 如果 Aiven 创建了其他用户。使用实际的用户名。

## 步骤 3: 创建数据库表

在连接到 MySQL 之前，你需要执行 `database.sql` 脚本来创建表结构。

### 选项 A: 使用 DBeaver (推荐)

1. 安装 [DBeaver Community Edition](https://dbeaver.io/download/)
2. 打开 DBeaver，点击 "Database" → "New Database Connection"
3. 选择 "MySQL"，点击 "Next"
4. 填入 Aiven 连接信息：
   - Server Host: `your-aiven-host.aivencloud.com`
   - Port: `3306`
   - Database: `your_database_name`
   - Username: `avnadmin`
   - Password: `your-password`
5. 点击 "Finish" 或 "Test Connection..."
6. 连接成功后，打开 `database.sql` 文件
7. 执行 SQL 脚本（点击 "Execute"）

### 选项 B: 使用 Aiven 控制台

1. 登录 Aiven console
2. 找到你的 MySQL 服务
3. 点击 "Database" 或进入 SQL editor
4. 复制 `database.sql` 的内容
5. 粘贴并执行

### 选项 C: 使用命令行

```bash
# 确保已安装 MySQL 客户端
mysql -h your-aiven-host.aivencloud.com -u avnadmin -p your_database_name < database.sql

# 输入密码（如果提示）
```

## 步骤 4: 验证数据库连接

执行以下命令检查是否可以连接到 MySQL：

```bash
mysql -h your-aiven-host.aivencloud.com -u avnadmin -p your_database_name -e "SELECT COUNT(*) FROM users;"
```

应该返回 0（因为是新数据库）。

## 步骤 5: 启动应用

```bash
npm run dev
```

你应该看到：
```
✅ Connected to MySQL (Aiven)
✅ Database connection verified
✅ Server running on http://localhost:3000
```

## 故障排除

### 错误: "getaddrinfo ENOTFOUND your-aiven-host.aivencloud.com"
- **原因**: 无法解析主机名
- **解决**: 
  - 检查 .env 中的 MYSQL_HOST 是否正确
  - 检查网络连接
  - 确保主机名没有多余空格

### 错误: "access denied for user 'avnadmin'"
- **原因**: 用户名或密码错误
- **解决**: 
  - 从 Aiven console 复制正确的凭证
  - 确保密码中没有特殊字符被误解
  - 如果密码包含 @ $ 等符号，用引号包围

### 错误: "Unknown database"
- **原因**: 数据库不存在或名称错误
- **解决**: 
  - 在 Aiven console 中创建数据库
  - 或在 .env 中使用默认数据库名（通常是你项目的数据库）
  - 确保数据库名称与 MYSQL_DATABASE 匹配

### 错误: "Table 'xxxx' doesn't exist"
- **原因**: 还未执行 database.sql
- **解决**: 按照步骤 3 执行 SQL 脚本

## 内容测试

1. 访问 http://localhost:3000
2. 点击 "去注册" (Register)
3. 输入邮箱 (如 test@qq.com)
4. 输入邮箱授权码（不是密码！）
5. 应该看到注册成功信息

## 备注

- Aiven 提供免费层级，适合开发和测试
- 所有用户初始角色是 `student`
- 要创建管理员用户，需要手动在数据库中修改角色：
  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
  ```
- 默认的测试管理员账户（如果执行了 database.sql）：
  - 邮箱: `admin@example.com`
  - 密码: `test123` (需要使用邮箱授权码，不是这个密码)
