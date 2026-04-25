@echo off
REM 在线考试系统 - Windows 配置脚本
REM 使用: setup-config.bat

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════╗
echo ║  在线考试系统 - Windows 配置向导                 ║
echo ╚════════════════════════════════════════════════════╝
echo.

REM 检查Node.js
echo [*] 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
  echo [!] Node.js 未安装，请先安装 Node.js
  echo    访问: https://nodejs.org/
  exit /b 1
) else (
  echo [✓] Node.js 已安装
)

echo.
echo [1] 数据库选择
echo [1] SQLite（推荐，无需配置）
echo [2] 本地 MySQL
echo [3] 云 MySQL (Aiven)
echo.
set /p dbChoice="请选择 (1/2/3): "

if "%dbChoice%"=="1" (
  echo [✓] 已选择 SQLite
  set "MYSQL_HOST="
) else if "%dbChoice%"=="2" (
  echo.
  echo [配置本地 MySQL]
  set /p MYSQL_HOST="MySQL 主机 (默认localhost): "
  if "!MYSQL_HOST!"=="" set "MYSQL_HOST=localhost"
  
  set /p MYSQL_PORT="MySQL 端口 (默认3306): "
  if "!MYSQL_PORT!"=="" set "MYSQL_PORT=3306"
  
  set /p MYSQL_USER="MySQL 用户名 (默认root): "
  if "!MYSQL_USER!"=="" set "MYSQL_USER=root"
  
  set /p MYSQL_PASSWORD="MySQL 密码: "
  
  set /p MYSQL_DATABASE="数据库名 (默认exam_system): "
  if "!MYSQL_DATABASE!"=="" set "MYSQL_DATABASE=exam_system"
) else if "%dbChoice%"=="3" (
  echo.
  echo [配置 Aiven MySQL]
  set /p MYSQL_HOST="Aiven 主机: "
  set /p MYSQL_PORT="Aiven 端口: "
  set /p MYSQL_USER="Aiven 用户名: "
  set /p MYSQL_PASSWORD="Aiven 密码: "
  set /p MYSQL_DATABASE="数据库名: "
) else (
  echo [!] 无效选择，使用 SQLite
  set "MYSQL_HOST="
)

echo.
echo [2] JWT 密钥生成
set /p genJWT="要生成新的 JWT 密钥吗? (y/n): "

if /i "%genJWT%"=="y" (
  echo.
  echo [*] 生成中...
  for /f "delims=" %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set "JWT_SECRET=%%i"
  echo [✓] JWT_SECRET 已生成
  echo.
  echo !JWT_SECRET!
  echo.
) else (
  set /p JWT_SECRET="输入现有的 JWT_SECRET: "
)

echo.
echo [3] 运行环境
echo [1] development (推荐用于开发)
echo [2] production (用于部署)
echo.
set /p envChoice="请选择 (1/2): "

if "%envChoice%"=="2" (
  set "NODE_ENV=production"
) else (
  set "NODE_ENV=development"
)
echo [✓] 环境: !NODE_ENV!

echo.
echo [4] 应用地址
set /p APP_URL="应用地址 (默认http://localhost:3000): "
if "!APP_URL!"=="" set "APP_URL=http://localhost:3000"
echo [✓] 地址: !APP_URL!

echo.
echo [5] 可选服务
set /p hasGemini="配置 Gemini API? (y/n): "
if /i "!hasGemini!"=="y" (
  set /p GEMINI_API_KEY="Gemini API Key: "
) else (
  set "GEMINI_API_KEY="
)

set /p hasEmail="配置邮箱服务? (y/n): "
if /i "!hasEmail!"=="y" (
  set /p EMAIL_SENDER="邮箱地址 (例: 123456@qq.com): "
  set /p EMAIL_AUTH_CODE="邮箱授权码: "
) else (
  set "EMAIL_SENDER="
  set "EMAIL_AUTH_CODE="
)

REM 生成 .env 文件
echo.
echo [*] 生成 .env 文件...

if exist .env (
  echo [*] 备份现有 .env...
  rename .env .env.backup
)

(
  if not "!MYSQL_HOST!"=="" echo MYSQL_HOST=!MYSQL_HOST!
  if not "!MYSQL_PORT!"=="" echo MYSQL_PORT=!MYSQL_PORT!
  if not "!MYSQL_USER!"=="" echo MYSQL_USER=!MYSQL_USER!
  if not "!MYSQL_PASSWORD!"=="" echo MYSQL_PASSWORD=!MYSQL_PASSWORD!
  if not "!MYSQL_DATABASE!"=="" echo MYSQL_DATABASE=!MYSQL_DATABASE!
  echo JWT_SECRET=!JWT_SECRET!
  echo NODE_ENV=!NODE_ENV!
  echo APP_URL=!APP_URL!
  if not "!GEMINI_API_KEY!"=="" echo GEMINI_API_KEY=!GEMINI_API_KEY!
  if not "!EMAIL_SENDER!"=="" echo EMAIL_SENDER=!EMAIL_SENDER!
  if not "!EMAIL_AUTH_CODE!"=="" echo EMAIL_AUTH_CODE=!EMAIL_AUTH_CODE!
) > .env

echo [✓] .env 文件已创建

echo.
echo ╔════════════════════════════════════════════════════╗
echo ║            配置完成！接下来的步骤                ║
echo ╚════════════════════════════════════════════════════╝
echo.

echo [1] 安装依赖:
echo     npm install
echo.

if "%dbChoice%"=="2" (
  echo [2] 初始化数据库 (可选):
  echo     mysql -u !MYSQL_USER! -p !MYSQL_DATABASE! ^< database.sql
  echo.
  echo [3] 启动应用:
) else if "%dbChoice%"=="3" (
  echo [2] 初始化数据库 (可选):
  echo     mysql -h !MYSQL_HOST! -P !MYSQL_PORT! -u !MYSQL_USER! -p !MYSQL_DATABASE! ^< database.sql
  echo.
  echo [3] 启动应用:
) else (
  echo [2] 启动应用:
)

echo     npm run dev
echo.

echo [4] 访问应用:
echo     !APP_URL!/login
echo.

echo [5] 默认管理员:
echo     邮箱: admin@qq.com
echo     密码: admin123
echo.

echo [*] .env 文件内容:
echo.
type .env
echo.

echo [✓] 配置向导完成！
echo.

pause
