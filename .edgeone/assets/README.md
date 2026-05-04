# 3D动画学院 - Cloudflare 全栈部署指南

> **技术栈**: Cloudflare Pages + Workers + D1 (SQLite) + R2（可选）

---

## 一、架构总览

```
用户浏览器
    │
    ▼
┌──────────────────────┐
│  Cloudflare Pages    │  ← 前端静态文件 (index.html, styles.css, script.js)
│  *.pages.dev          │     自动从 GitHub 部署
└───────────┬──────────┘
            │ /api/* 请求
            ▼
┌──────────────────────┐
│  Cloudflare Worker    │  ← 后端 API (worker/index.js)
│                       │     处理认证、CRUD、文件上传
└───────────┬──────────┘
            │
    ┌───────┴───────┐
    ▼               ▼
┌────────┐   ┌──────────┐
│ D1 数据库 │   │ R2 存储  │  ← SQLite / 对象存储
│ (SQLite) │   │ (可选)   │
└────────┘   └──────────┘
```

---

## 二、快速开始（5 步完成部署）

### 前置条件

- 一个 [Cloudflare 账号](https://dash.cloudflare.com)（免费）
- 已安装 [Node.js](https://nodejs.org) (v18+)
- 已安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

```bash
npm install -g wrangler
wrangler login   # 登录 Cloudflare 账号
```

### 第 1 步：创建 D1 数据库

```bash
# 创建数据库
npx wrangler d1 create 3d-academy-db

# 输出类似：
# ✅ Successfully created DB '3d-academy-db'
# [[d1_databases]]
# binding = "DB"
# database_name = "3d-academy-db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  ← 复制这个 ID

# 将 database_id 复制到 wrangler.toml 的对应位置

# 执行建表脚本（本地）
npx wrangler d1 execute 3d-academy-db --local --file=./d1/schema.sql

# 执行建表脚本（远程/生产环境）
npx wrangler d1 execute 3d-academy-db --file=./d1/schema.sql
```

### 第 2 步：创建 R2 存储桶（可选，用于文件上传）

```bash
# 启用 R2（首次使用需要，免费额度内不收费）
# 在 Cloudflare Dashboard > R2 对象存储 中点击"启用 R2 对象存储"

# 创建存储桶
npx wrangler r2 bucket create 3d-academy-files
```

### 第 3 步：修改配置

编辑 `wrangler.toml`：

```toml
# 必须修改：
database_id = "你的真实ID"           # 替换为第1步获取的 ID

# 建议修改：
JWT_SECRET = "改成你自己的随机密钥"   # 至少32个字符的随机字符串
APP_URL = "https://your-site.pages.dev"  # 你的 Pages 域名
```

### 第 4 步：部署 Worker（后端 API）

```bash
# 本地测试
npx wrangler dev

# 访问 http://localhost:8787/api/health 检查是否正常运行

# 部署到 Cloudflare
npx wrangler deploy

# 输出：
# Published 3d-academy-api (生产环境)
#   https://3d-academy-api.your-subdomain.workers.dev
```

### 第 5 步：部署 Pages（前端）

**方法 A：通过 GitHub 连接（推荐）**

1. 把代码推送到 GitHub 仓库
2. 进入 [Cloudflare Dashboard > Pages](https://dash.cloudflare.com/)
3. 点击「创建项目」→「连接到 Git」
4. 选择你的仓库，配置构建设置：
   - **框架预设**: 无
   **构建命令**: 留空（纯静态站点无需构建）
   - **输出目录**: `./` 或 `.`
   - **根目录**: `/学习网站`
5. 点击「保存并部署」
6. 部署完成后，进入 **设置 > 函数** → 绑定 Worker：

**方法 B：直接上传**

```bash
# 使用 Wrangler Pages 发布
npx wrangler pages publish ./ --project-name=3d-academy-web
```

### 关键步骤：Pages 与 Worker 联动

为了让 Pages 的前端能调用 Worker 的 API，有两种方案：

#### 方案 1：Worker 作为 Pages Function（推荐）

在项目根目录创建 `functions` 目录，将 Worker 代码放入：

```
学习网站/
├── index.html
├── script.js
├── styles.css
├── functions/              ← 新增目录
│   ├── api/                ← 自动路由 /api/*
│   │   ├── auth.ts         （或 .js）
│   │   ├── tutorials.ts
│   │   ├── mistakes.ts
│   │   ├── homework.ts
│   │   ├── roadmap.ts
│   │   ├── upload.ts
│   │   └── health.ts
│   └── user.ts
└── worker/index.js        ← 可保留作为独立 Worker
```

Pages Functions 会自动处理 `/api/*` 路由。

#### 方案 2：自定义域名绑定

将 Worker 和 Pages 绑定同一个自定义域名：
- Pages: `www.your-domain.com`
- Worker: `api.your-domain.com`
- 前端 `API_BASE` 设为 `'https://api.your-domain.com'`

#### 方案 3：最简单 - 使用 Workers.dev 子域（当前默认方式）

当前 `script.js` 中的 `API_BASE` 配置为空字符串（同源），这意味着：
- 如果 Pages 和 Worker 共享同一个子域名，API 可以同源调用
- 开发时使用 `http://localhost:8787`

---

## 三、本地开发调试

```bash
# 终端 1：启动 Worker（后端 API）
npx wrangler dev

# 终端 2：用 VS Code Live Server 或其他工具打开 index.html
# 确保 script.js 中 API_BASE = 'http://localhost:8787'

# 测试 API
curl http://localhost:8787/api/health
```

---

## 四、API 接口文档

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册 | 否 |
| POST | `/api/auth/login` | 登录 | 否 |
| GET | `/api/user/profile` | 获取个人信息 | 需要 |
| PUT | `/api/user/profile` | 更新个人信息 | 需要 |
| GET | `/api/tutorials` | 教程列表（支持 ?filter= & ?search=）| 需要 |
| POST | `/api/tutorials` | 创建教程 | 需要 |
| PUT | `/api/tutorials/:id` | 编辑教程 | 需要 |
| DELETE | `/api/tutorials/:id` | 删除教程 | 需要 |
| GET | `/api/roadmap` | 学习路线进度 | 需要 |
| PUT | `/api/roadmap` | 更新打卡状态 | 需要 |
| GET | `/api/mistakes` | 错题集列表（支持筛选搜索）| 需要 |
| POST | `/api/mistakes` | 添加错题 | 需要 |
| PUT | `/api/mistakes/:id` | 编辑错题 | 需要 |
| DELETE | `/api/mistakes/:id` | 删除错题 | 需要 |
| PATCH | `/api/mistakes/:id/master` | 标记掌握 | 需要 |
| GET | `/api/homework` | 作业列表 | 需要 |
| POST | `/api/homework` | 添加作业 | 需要 |
| PUT | `/api/homework/:id` | 编辑作业 | 需要 |
| DELETE | `/api/homework/:id` | 删除作业 | 需要 |
| POST | `/api/upload` | 上传文件到 R2 | 需要 |
| GET | `/api/upload/:key` | 下载文件 | 需要 |

**认证方式**：请求头携带 `Authorization: Bearer <token>`（登录/注册后返回）

---

## 五、费用说明（全部免费范围内）

| 服务 | 免费额度 | 本项目预估用量 |
|------|---------|--------------|
| **Pages** | 无限请求、无限带宽 | 静态 HTML/CSS/JS ≈ 0 成本 |
| **Workers** | 10 万次请求/天 | 个人学习站远低于限额 |
| **D1** | 5GB 存储 / 500万次读取/天 | 用户数据 < 10MB |
| **R2** | 10GB 存储 / Class A 100万次/月 | 文件附件 < 100MB |

> **总计成本**: $0/月（免费层完全够用）

---

## 六、安全建议（生产环境必做）

1. **更换 JWT_SECRET**: 当前是占位符，务必改为强随机密钥
2. **启用 HTTPS**: Cloudflare 默认提供
3. **密码哈希**: 当前使用 SHA-256+盐值，生产环境建议升级为 bcrypt/argon2
4. **Rate Limiting**: Worker 中添加请求频率限制防暴力破解
5. **CORS 限制**: 生产环境将 `Access-Control-Allow-Origin` 改为具体域名

---

## 七、项目文件结构

```
学习网站/
├── index.html              # 主页面
├── script.js               # 前端逻辑（已改造为 API 版）
├── styles.css              # 样式表
├── worker/
│   └── index.js            # 后端 Worker API（~500行）
├── d1/
│   └── schema.sql          # D1 数据库建表脚本
├── wrangler.toml           # Cloudflare 配置
└── README.md               # 本文件
```

---

## 八、常见问题

### Q: 本地运行时跨域报错怎么办？
A: Worker 已配置 CORS 允许所有来源。确保 `script.js` 中 `API_BASE` 正确指向本地 Worker 地址 (`http://localhost:8787`)。

### Q: EmailJS 验证码怎么配置？
A:
1. 到 https://www.emailjs.com 注册账号
2. 创建邮件服务（如 Gmail SMTP）
3. 创建邮件模板，变量设为 `{{to_email}}`, `{{verify_code}}`, `{{expire_minutes}}`
4. 替换 `script.js` 中的 `PUBLIC_KEY`, `SERVICE_ID`, `TEMPLATE_ID`

### Q: 如何重置数据库？
A: ```bash
npx wrangler d1 execute 3d-academy-db --command "DROP TABLE IF EXISTS users, tutorials, roadmap_progress, mistakes, homework, files;"
npx wrangler d1 execute 3d-academy-db --file=./d1/schema.sql
```

---

*最后更新: 2026-05-03*
