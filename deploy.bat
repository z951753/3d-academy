@echo off
chcp 65001 >nul
echo ============================================
echo   3D动画学院 - Cloudflare 一键部署脚本
echo ============================================
echo.

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [错误] 请先安装 Node.js: https://nodejs.org
  pause & exit /b 1
)

echo [1/6] 检查 Wrangler CLI...
where wrangler >nul 2>&1
if %errorlevel% neq 0 (
  echo 正在安装 Wrangler...
  call npm install -g wrangler
)

echo.
echo [2/6] 登录 Cloudflare...
call wrangler login
if %errorlevel% neq 0 (
  echo [错误] 登录失败，请重试
  pause & exit /b 1
)

echo.
echo [3/6] 创建 D1 数据库...
call wrangler d1 create 3d-academy-db 2>nul
if %errorlevel% equ 0 (
  echo 数据库创建成功！请将输出的 database_id 复制到 wrangler.toml
  echo.
  set /p DB_ID="请输入你的 D1 Database ID: "
  
  REM 替换 wrangler.toml 中的 database_id
  powershell -Command "(Get-Content wrangler.toml) -replace 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', '%DB_ID%' | Set-Content wrangler.toml"
  echo database_id 已更新！
) else (
  echo 数据库已存在，跳过创建...
)

echo.
echo [4/6] 初始化数据库表结构...
call wrangler d1 execute 3d-academy-db --file=./d1/schema.sql --remote
if %errorlevel% neq 0 (
  echo [警告] 远程执行失败，尝试本地执行...
  call wrangler d1 execute 3d-academy-db --file=./d1/schema.sql --local
)

echo.
echo [5/6] 创建 R2 存储桶（可选）...
call wrangler r2 bucket create 3d-academy-files 2>nul
if %errorlevel% equ 0 (
  echo R2 存储桶创建成功！
) else (
  echo R2 存储桶可能已存在，或需要先在 Dashboard 启用 R2
)

echo.
echo [6/6] 部署 Worker 后端 API...
call wrangler deploy
if %errorlevel% neq 0 (
  echo [错误] 部署失败！请检查配置
  pause & exit /b 1
)

echo.
echo ============================================
echo   部署成功！
echo ============================================
echo.
echo 后端 API 地址: https://3d-academy-api.你的账户.workers.dev
echo.
echo 下一步：
echo   1. 将代码推送到 GitHub
echo   2. 在 Cloudflare Dashboard ^> Pages 创建项目并连接该仓库
echo   3. 构建设置：框架预设=无, 构建命令=空, 输出目录=./, 根目录=/学习网站
echo   4. 部署完成后访问 https://你的项目.pages.dev
echo.
pause
