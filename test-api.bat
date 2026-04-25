@echo off
REM 在线考试系统 - 登录接口测试脚本
REM Windows 批处理脚本 (使用curl)

echo ====================================
echo 在线考试系统 - API 接口测试
echo ====================================
echo.

set API_URL=http://localhost:3000

REM 颜色定义 (Windows需要特殊处理)
set GREEN=[32m
set RED=[31m
set YELLOW=[33m
set RESET=[0m

echo 测试1: 服务器健康检查
echo -----------
curl -s %API_URL%/api/health | findstr error >nul
if errorlevel 1 (
  echo ✓ 后端服务正常运行
) else (
  echo ✗ 后端服务不响应
)
echo.

echo 测试2: 注册新用户 - 有效QQ邮箱
echo -----------
curl -s -X POST %API_URL%/api/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"testuser001@qq.com\",\"password\":\"password123\"}" | findstr message >nul
if errorlevel 1 (
  echo 检查回复...
  curl -s -X POST %API_URL%/api/register ^
    -H "Content-Type: application/json" ^
    -d "{\"email\":\"testuser001@qq.com\",\"password\":\"password123\"}"
) else (
  echo ✓ 注册成功
)
echo.

echo 测试3: 注册 - 重复邮箱（应该失败）
echo -----------
curl -s -X POST %API_URL%/api/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"testuser001@qq.com\",\"password\":\"password456\"}" | findstr error
echo.

echo 测试4: 注册 - 非QQ邮箱（应该失败）
echo -----------
curl -s -X POST %API_URL%/api/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"notqq@gmail.com\",\"password\":\"password123\"}" | findstr "QQ email"
echo.

echo 测试5: 注册 - 密码过短（应该失败）
echo -----------
curl -s -X POST %API_URL%/api/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@qq.com\",\"password\":\"12345\"}" | findstr "6-20"
echo.

echo 测试6: 登录 - 有效凭证
echo -----------
curl -s -X POST %API_URL%/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@qq.com\",\"password\":\"admin123\"}"
echo.

echo 测试7: 登录 - 错误密码（应该失败）
echo -----------
curl -s -X POST %API_URL%/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@qq.com\",\"password\":\"wrongpassword\"}" | findstr "Invalid"
echo.

echo 测试8: 登录 - 不存在的邮箱（应该失败）
echo -----------
curl -s -X POST %API_URL%/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"notexist@qq.com\",\"password\":\"password123\"}" | findstr "Invalid"
echo.

echo 测试9: 验证邮箱大小写不敏感
echo -----------
curl -s -X POST %API_URL%/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"ADMIN@QQ.COM\",\"password\":\"admin123\"}" | findstr "token"
if errorlevel 1 (
  echo ✗ 邮箱大小写转换失败
) else (
  echo ✓ 邮箱大小写处理正确
)
echo.

echo ====================================
echo 测试完成
echo ====================================
echo.
echo 提示：
echo - 确保后端服务在 http://localhost:3000 运行
echo - npm run dev 启动开发服务器
echo - 要持续监控，使用: curl -v [URL]
