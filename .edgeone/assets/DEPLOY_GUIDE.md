# 3D动画学院 - Vercel + Supabase 部署指南

> 国内完全可用，免费，无需 VPN

## 架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   前端静态   │     │  API 后端    │     │  数据库      │
│  (Vercel)   │────▶│  (Vercel)    │────▶│  (Supabase) │
│             │     │  Serverless  │     │ PostgreSQL  │
└─────────────┘     └──────────────┘     └─────────────┘
```

## 第 1 步：注册 Supabase（免费数据库）

1. 打开 https://supabase.com （国内可访问）
2. 点 **Start your project**
3. 用 GitHub / Google 账号登录
4. 创建新项目：
   - Name: `3d-academy`
   - Database Password: 记住这个密码（后面不用填，自动生成）
   - Region: 选 **Singapore** 或 **Northeast Asia (Tokyo)**（离中国近）
5. 等待创建完成（约 1-2 分钟）

## 第 2 步：创建数据表

在 Supabase 项目中：

1. 左侧菜单点 **SQL Editor**
2. 点 **New Query**
3. 复制 `supabase/schema.sql` 的全部内容粘贴进去
4. 点 **Run** 执行
5. 应该看到 "Success" 提示

## 第 3 步：获取 Supabase 连接信息

1. 左侧菜单点 **Settings** → **API**
2. 找到以下两个值并复制：

| 变量 | 值位置 |
|------|--------|
| `SUPABASE_URL` | Project URL (类似 `https://xxxxx.supabase.co`) |
| `SUPABASE_KEY` | service_role key (在 "Project API keys" 下面找 **secret** 开头的那个) |

> ⚠️ 用 **service_role** (secret)，不要用 anon key！service_role 有完整权限。

## 第 4 步：注册 Vercel（免费部署）

1. 打开 https://vercel.com
2. 用 GitHub 账号登录（或邮箱注册）
3. 登录后进入 Dashboard

## 第 5 步：安装 Vercel CLI 并部署

### 方法 A：用 CLI 一键部署（推荐）

打开终端：

```powershell
cd c:\Users\24142\Downloads\TKM-main\学习网站

# 安装依赖
npm install

# 登录 Vercel（会弹出浏览器）
npx vercel login

# 部署！（首次会询问项目名）
npx vercel --prod
```

部署过程中会提示设置环境变量，输入：

- **SUPABASE_URL**: 你的 Project URL
- **SUPABASE_KEY**: 你的 service_role key
- **JWT_SECRET**: 随便写一个长字符串（如 `my-super-secret-key-2026`）

### 方法 B：通过网页部署（不需要 CLI）

1. 把代码推送到 GitHub 仓库
2. 打开 https://vercel.com/new
3. 导入你的 GitHub 仓库
4. 设置：
   - **Framework Preset**: Other
   - **Root Directory**: `/学习网站` 或留空
   - **Build Command**: 留空
   - **Output Directory**: `.`
5. 在 Environment Variables 中添加上面三个变量
6. 点 **Deploy**

## 第 6 步：访问你的网站

部署成功后，Vercel 会给你一个 URL，类似：

```
https://3d-academy.vercel.app
https://你的项目名.vercel.app
```

直接访问就能用了！

---

## 本地开发测试

```powershell
cd c:\Users\24142\Downloads\TKM-main\学习网站

# 安装依赖
npm install

# 启动本地开发服务器（包含 API）
npx vercel dev

# 或者纯静态预览（无后端）
python -m http.server 8080
```

访问 http://localhost:3000 即可测试。

---

## 文件结构说明

```
学习网站/
├── index.html          # 前端页面
├── styles.css          # 样式
├── script.js           # 前端交互逻辑
├── package.json        # Node.js 依赖配置
├── vercel.json         # Vercel 部署配置
├── api/                # Vercel Serverless Functions (后端)
│   ├── _lib.js         # 共享工具库（数据库连接、认证）
│   ├── index.js        # 主路由
│   ├── auth/
│   │   ├── register.js # 注册
│   │   ├── login.js    # 登录
│   │   └── logout.js   # 登出
│   ├── user/profile.js # 用户资料
│   ├── modules/index.js    # 学习模块 CRUD
│   ├── tutorials/index.js  # 教程 CRUD
│   ├── roadmap.js           # 学习路线
│   ├── mistakes/index.js    # 错题集 CRUD
│   ├── homework/index.js    # 作业存储 CRUD
│   └── upload.js            # 文件上传
├── supabase/
│   └── schema.sql      # 数据库建表脚本
└── d1/
    └── schema.sql      # (Cloudflare D1 版本，已弃用)
```

## 免费额度

| 服务 | 免费额度 | 说明 |
|------|---------|------|
| **Vercel** | 100GB 带宽/月, 无限 Serverless 函数调用 | 个人项目完全够用 |
| **Supabase** | 500MB 数据库, 50k 月活用户, 1GB 存储 | 小团队够用 |

## 常见问题

### Q: 注册/登录提示错误？
A: 检查 SUPABASE_URL 和 SUPABASE_KEY 是否正确填写。确保用的是 **service_role** key。

### Q: 数据没有保存？
A: 确保已注册/登录。未登录时处于演示模式（localStorage），刷新可能丢失。

### Q: 图片上传失败？
A: Vercel 模式下文件以 base64 存入数据库，单文件限制 5MB。大文件建议后续接入对象存储。
