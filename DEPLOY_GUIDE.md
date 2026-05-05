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

### Q: 图片上传后无法查看？(已修复 ✅)
A: **问题原因**：之前的文件上传功能未完整实现，导致上传的图片无法显示。

**解决方案**（已在 2026-05-05 更新中修复）：
1. 文件现在以 **Base64 格式**直接存储在数据库的 `files` 字段中
2. 上传后会自动保存完整的图片数据，刷新页面后仍可查看
3. 支持拖拽上传和点击选择文件
4. 单文件限制 **5MB**，支持常见图片格式（JPG、PNG、GIF、WebP）

**如果仍然无法查看**：
- 确认你使用的是**最新代码**（包含 2026-05-05 的更新）
- 检查浏览器控制台是否有错误信息
- 尝试清除缓存后重新访问

### Q: 国内访问速度慢？
A:
1. Supabase 选择 **Singapore (新加坡)** 或 **Tokyo (东京)** 节点
2. Vercel 会自动选择最近的 CDN 节点
3. 如果仍然慢，可以考虑使用国内云服务（阿里云、腾讯云等）

### Q: 如何备份数据？
A:
1. 登录 Supabase Dashboard
2. 左侧菜单 → **Table Editor**
3. 选择要导出的表
4. 右上角导出为 CSV/SQL

---

## 技术细节（开发者参考）

### 文件存储方案

当前实现采用 **Base64 + 数据库存储** 方案：

```
用户上传图片
    ↓
前端转为 Base64 (FileReader.readAsDataURL)
    ↓
POST /api/upload (发送 JSON，包含 base64 数据)
    ↓
后端返回文件元信息 {key, name, size, type, data}
    ↓
保存到 homework/mistakes 表的 files 字段 (JSON 格式)
    ↓
查看时从数据库读取 base64 数据直接显示
```

**优点**：
- ✅ 无需配置额外的对象存储服务
- ✅ 国内可直接使用，无需 VPN
- ✅ 部署简单，只需 Vercel + Supabase
- ✅ 数据一致性有保障（文件和业务数据在同一数据库）

**缺点**：
- ⚠️ 数据库会变大（base64 比原文件大约 33%）
- ⚠️ 不适合超大文件（>5MB）
- ⚠️ 大量图片可能影响查询性能

**未来可优化方向**：
- 接入阿里云 OSS / 腾讯云 COS（国内速度快）
- 图片压缩后再存储
- 使用缩略图机制

---

## 更新日志

### 2026-05-05 - 文件上传功能修复
- ✅ 重写 `/api/upload` 端点，支持真正的文件处理
- ✅ 修改前端 `uploadFileToR2` 函数，支持 Base64 传输
- ✅ 修复作业和错题集的文件提交逻辑，保留完整数据
- ✅ 优化 Vercel 配置，添加 CORS 头支持
- ✅ 创建 `.env.example` 环境变量模板
- ✅ 更新部署指南，添加故障排查说明
