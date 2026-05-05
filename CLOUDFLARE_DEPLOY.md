# 3D动画学院 - Cloudflare Workers + D1 部署指南

> 国内可访问，免费，高性能

## 架构说明

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   前端静态   │     │  Cloudflare      │     │  Cloudflare  │
│  (Pages)    │────▶│  Workers (API)   │────▶│  D1 (SQLite) │
│             │     │                  │     │             │
└─────────────┘     └──────────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ R2 (文件存储)│
                    └─────────────┘
```

## 第 1 步：注册 Cloudflare 账号（免费）

1. 打开 **https://dash.cloudflare.com/sign-up**
2. 注册账号（邮箱即可）
3. 登录后进入 Dashboard

## 第 2 步：创建 D1 数据库

### 2.1 创建数据库

1. 左侧菜单点击 **Workers & Pages**
2. 点击 **D1 SQL Database** 标签
3. 点击 **Create database**
4. 名称输入：`3d-academy-db`
5. 位置选择：**APAC (Asia-Pacific)** ✅ 离中国最近
6. 点击 **Create**

### 2.2 初始化数据表

创建完成后：

1. 点击刚创建的数据库名称
2. 点击 **Console** 标签
3. 复制 `d1/schema.sql` 的全部内容粘贴进去
4. 点击 **Execute** 执行
5. 看到 "Success" 提示就成功了 ✅

### 2.3 记录 Database ID

在数据库详情页找到 **Database ID**，复制保存：
```
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## 第 3 步：创建 R2 存储桶（可选，用于文件上传）

1. 左侧菜单点击 **R2 Object Storage**
2. 点击 **Create bucket**
3. 名称：`3d-academy-files`
4. 位置选择：**APAC**
5. 点击 **Create bucket**

⚠️ 首次使用需要在 Billing 页面启用 R2（免费额度：10GB 存储）

## 第 4 步：部署 Worker（两种方式）

### 方式 A：通过 GitHub 自动部署（推荐）✅

#### 4.1 连接 GitHub 仓库

1. 回到 **Workers & Pages**
2. 点击 **Create** → **Pages** 标签
3. 选择 **Connect to Git**
4. 授权 GitHub 并选择 `z951753/3d-academy` 仓库

#### 4.2 配置构建设置

| 设置项 | 值 |
|-------|-----|
| **Project name** | `3d-academy-api` |
| **Production branch** | `main` |
| **Framework preset** | **None** |
| **Build command** | 留空 |
| **Build output directory** | `. / worker` |

#### 4.3 绑定 D1 数据库

滚动到 **Settings** 部分：

1. 找到 **D1 databases bindings** 或 **Bindings**
2. 添加：
   - **Variable name**: `DB`
   - **Database**: 选择你创建的 `3d-academy-db`

3. 如果有 R2 存储桶，添加：
   - **Variable name**: `BUCKET`
   - **Bucket**: 选择 `3d-academy-files`

#### 4.4 添加环境变量

添加以下环境变量：

| 变量名 | 值 |
|--------|-----|
| `JWT_SECRET` | `your-random-secret-key-here` |

#### 4.5 点击 Save and Deploy

等待 1-2 分钟... 看到 **Success!** 就完成了！🎉

你会得到一个网址，类似：
```
https://3d-academy-api.your-subdomain.workers.dev
```

---

### 方式 B：使用 Wrangler CLI 部署

```powershell
# 1. 安装 Wrangler CLI
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 编辑 wrangler.toml，填入真实的 database_id

# 4. 本地测试
wrangler dev

# 5. 部署到生产环境
wrangler deploy
```

## 第 5 步：配置前端连接 API

部署成功后，需要告诉前端 API 的地址：

### 方法 1：修改 script.js（推荐开发时用）

打开 `script.js`，找到第 30 行左右：

```javascript
const API_BASE = '';  // 改为你的 Worker URL
```

改为：

```javascript
const API_BASE = 'https://3d-academy-api.your-subdomain.workers.dev';
```

### 方法 2：生产环境自动检测（推荐）

前端代码已经支持同源部署，如果前后端在同一域名下，无需修改。

## 第 6 步：测试功能

访问你得到的网址，测试：

1. ✅ 注册新账号
2. ✅ 登录系统
3. ✅ 查看学习模块
4. ✅ 上传作业和图片
5. ✅ 社区广场查看公开作业
6. ✅ 点赞功能

---

## 免费额度

| 服务 | 免费额度 | 说明 |
|------|---------|------|
| **Workers** | 10万次请求/天 | 完全够用 |
| **D1 数据库** | 5GB 存储, 500万次读取/天 | 够用 |
| **R2 存储** | 10GB 存储, 1000万次读取/月 | 可选 |
| **Pages** | 无限静态请求 | 前端托管 |

## 常见问题

### Q: 如何重新部署？
A: 推送代码到 GitHub main 分支，Cloudflare 会自动重新部署。

### Q: 如何查看日志？
A: Cloudflare Dashboard → Workers & Pages → 你的项目 → Logs。

### Q: 数据库如何备份？
A: D1 Console → Export 可以导出数据库。

### Q: 如何修改环境变量？
A: 项目 Settings → Variables，修改后需要重新部署生效。

### Q: 国内访问速度？
A: APAC 节点延迟约 50-80ms，比 Vercel 快很多！

---

## 技术特性

✅ **完整功能**：
- 用户认证系统（注册/登录/Token）
- 学习模块管理
- 教程系统
- 错题集
- 作业提交与批改
- 文件上传/下载（Base64 或 R2）
- 社区广场（公开作业）
- 点赞功能
- 学习路线进度

✅ **性能优势**：
- Cloudflare Edge Network 全球 CDN
- D1 数据库低延迟查询
- Serverless 无需维护服务器
- 自动 HTTPS 和 DDoS 防护

---

## 更新日志

### 2026-05-05 - 完整动态网站版本
- ✅ 补全所有 API 端点（Worker 838行代码）
- ✅ 添加作业点赞功能
- ✅ 添加社区广场（公开作业列表）
- ✅ 更新数据库 Schema（likes、is_public 字段）
- ✅ 优化索引提升查询性能
- ✅ 完善 wrangler.toml 配置
- ✅ 创建详细部署指南
