// ============================================================
// 3D动画学院 - Cloudflare Worker 后端 API
// 部署: npx wrangler deploy
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return corsResponse();
    }

    // 路由分发
    try {
      // ===== 认证相关 =====
      if (url.pathname === '/api/auth/register' && request.method === 'POST')
        return handleRegister(request, env);
      if (url.pathname === '/api/auth/login' && request.method === 'POST')
        return handleLogin(request, env);
      if (url.pathname === '/api/user/profile') {
        const userId = await auth(request, env);
        if (!userId) return json({ error: '未登录' }, 401);
        if (request.method === 'GET')  return getProfile(userId, env);
        if (request.method === 'PUT')  return updateProfile(userId, request, env);
      }
      if (url.pathname === '/api/auth/logout' && request.method === 'POST')
        return handleLogout();

      // ===== 模块管理 CRUD =====
      const modMatch = url.pathname.match(/^\/api\/modules(?:\/(.+))?$/);
      if (modMatch) {
        const userId = await auth(request, env);
        if (!userId) return json({ error: '未登录' }, 401);
        const id = modMatch[1];
        if (!id && request.method === 'GET')     return getModules(url, userId, env);
        if (!id && request.method === 'POST')    return createModule(userId, request, env);
        if (id  && request.method === 'PUT')     return updateModule(id, userId, request, env);
        if (id  && request.method === 'DELETE')  return deleteModule(id, userId, env);
      }

      // ===== 教程 CRUD =====
      const tutMatch = url.pathname.match(/^\/api\/tutorials(?:\/(.+))?$/);
      if (tutMatch) {
        const userId = await auth(request, env);
        if (!userId) return json({ error: '未登录' }, 401);
        const id = tutMatch[1];
        if (!id && request.method === 'GET')     return getTutorials(url, userId, env);
        if (!id && request.method === 'POST')    return createTutorial(userId, request, env);
        if (id  && request.method === 'PUT')     return updateTutorial(id, userId, request, env);
        if (id  && request.method === 'DELETE')  return deleteTutorial(id, userId, env);
      }

      // ===== 学习路线 =====
      if (url.pathname === '/api/roadmap') {
        const userId = await auth(request, env);
        if (!userId) return json({ error: '未登录' }, 401);
        if (request.method === 'GET')  return getRoadmap(userId, env);
        if (request.method === 'PUT')  return updateRoadmap(userId, request, env);
      }

      // ===== 错题集 CRUD =====
      const mkMatch = url.pathname.match(/^\/api\/mistakes(?:\/(.+))?(?:\/(master))?$/);
      if (mkMatch) {
        const userId = await auth(request, env);
        if (!userId) return json({ error: '未登录' }, 401);
        const id = mkMatch[1];
        const action = mkMatch[2];
        if (!id && !action && request.method === 'GET')    return getMistakes(url, userId, env);
        if (!id && !action && request.method === 'POST')   return createMistake(userId, request, env);
        if (id && !action && request.method === 'PUT')     return updateMistake(id, userId, request, env);
        if (id && !action && request.method === 'DELETE')  return deleteMistake(id, userId, env);
        if (id && action && request.method === 'PATCH')    return toggleMastered(id, userId, env);
      }

      // ===== 作业存储 CRUD =====
      const hwMatch = url.pathname.match(/^\/api\/homework(?:\/(.+))?$/);
      if (hwMatch) {
        const userId = await auth(request, env);
        if (!userId) return json({ error: '未登录' }, 401);
        const id = hwMatch[1];
        if (!id && request.method === 'GET')     return getHomework(url, userId, env);
        if (!id && request.method === 'POST')    return createHomework(userId, request, env);
        if (id  && request.method === 'PUT')     return updateHomework(id, userId, request, env);
        if (id  && request.method === 'DELETE')  return deleteHomework(id, userId, env);

        // 作业点赞
        const likeMatch = url.pathname.match(/^\/api\/homework\/(.+)\/like$/);
        if (likeMatch && request.method === 'POST') {
          const hwId = likeMatch[1];
          return likeHomework(hwId, userId, env);
        }
      }

      // ===== 公开作业（社区广场）=====
      if (url.pathname === '/api/homework/public' && request.method === 'GET') {
        return getPublicHomework(url, env);
      }

      // ===== 文件上传/下载（R2）=====
      if (url.pathname === '/api/upload' && request.method === 'POST') {
        const userId = await auth(request, env);
        if (!userId) return json({ error: '未登录' }, 401);
        return uploadFile(userId, request, env);
      }

      const fileMatch = url.pathname.match(/^\/api\/upload\/(.+)$/);
      if (fileMatch) {
        const userId = await auth(request, env);
        if (!userId) return json({ error: '未登录' }, 401);
        return getFile(decodeURIComponent(fileMatch[1]), userId, env);
      }

      // ===== 健康检查 =====
      if (url.pathname === '/api/health') {
        return json({ status: 'ok', time: new Date().toISOString() });
      }

      return json({ error: 'API 路径不存在' }, 404);
    } catch (err) {
      console.error('Worker Error:', err);
      return json({ error: '服务器内部错误', detail: err.message }, 500);
    }
  }
};

// ==================== 工具函数 ====================

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function corsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function makeId(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

async function readBody(req) {
  return req.json().catch(() => ({}));
}

// ==================== 简单认证系统（Token）====================

function generateToken(userId) {
  // 简单 token: base64(userId + 时间戳 + 签名)
  const payload = btoa(JSON.stringify({
    uid: userId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天有效
    ts: Date.now()
  }));
  return payload;
}

async function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const decoded = JSON.parse(atob(token));
    if (!decoded.uid || !decoded.exp) return null;
    if (Date.now() > decoded.exp) return null; // 过期
    return decoded.uid;
  } catch {
    return null;
  }
}

async function auth(req, env) {
  const header = req.headers.get('Authorization') || '';
  const token = header.replace('Bearer ', '');
  return verifyToken(token);
}

// ==================== 密码哈希（简单实现，生产环境建议用 Web Crypto）====================

async function hashPassword(password, secret) {
  const data = new TextEncoder().encode(password + ':' + secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ==================== 认证处理函数 ====================

async function handleRegister(req, env) {
  const body = await readBody(req);
  const { email, password, nickname, verifyCode } = body;

  if (!email || !password || !nickname) {
    return json({ error: '邮箱、密码、昵称均为必填项' }, 400);
  }

  // 检查邮箱格式
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: '邮箱格式不正确' }, 400);
  }

  if (password.length < 6) {
    return json({ error: '密码至少6位' }, 400);
  }

  // 检查是否已注册
  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();
  if (existing) {
    return json({ error: '该邮箱已被注册' }, 409);
  }

  // 哈希密码
  const passwordHash = await hashPassword(password, env.JWT_SECRET || 'default-secret');

  const user = {
    id: makeId('user'),
    email,
    password_hash: passwordHash,
    nickname: nickname || email.split('@')[0],
    avatar_color: '',
    bio: '',
    created_at: new Date().toISOString(),
  };

  await env.DB.prepare(`
    INSERT INTO users (id, email, password_hash, nickname, avatar_color, bio, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(user.id, user.email, user.password_hash, user.nickname,
         user.avatar_color, user.bio, user.created_at).run();

  // 初始化学习路线进度
  await env.DB.prepare(`
    INSERT INTO roadmap_progress (user_id, checks, updated_at)
    VALUES (?, ?, ?)
  `).bind(user.id, '[]', new Date().toISOString()).run();

  const token = generateToken(user.id);
  return json({
    message: '注册成功',
    token,
    user: { id: user.id, email: user.email, nickname: user.nickname }
  }, 201);
}

async function handleLogin(req, env) {
  const body = await readBody(req);
  const { email, password } = body;

  if (!email || !password) {
    return json({ error: '请输入邮箱和密码' }, 400);
  }

  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email).first();

  if (!user) {
    return json({ error: '邮箱或密码错误' }, 401);
  }

  const inputHash = await hashPassword(password, env.JWT_SECRET || 'default-secret');
  if (inputHash !== user.password_hash) {
    return json({ error: '邮箱或密码错误' }, 401);
  }

  const token = generateToken(user.id);
  return json({
    message: '登录成功',
    token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarColor: user.avatar_color,
      bio: user.bio
    }
  });
}

async function handleLogout() {
  return json({ message: '已退出登录' });
}

// ==================== 用户资料 ====================

async function getProfile(userId, env) {
  const user = await env.DB.prepare(
    'SELECT id, email, nickname, avatar_color, bio, created_at FROM users WHERE id = ?'
  ).bind(userId).first();
  if (!user) return json({ error: '用户不存在' }, 404);
  return json(user);
}

async function updateProfile(userId, req, env) {
  const body = await readBody(req);
  const updates = [];
  const params = [];

  if (body.nickname !== undefined) { updates.push('nickname = ?'); params.push(body.nickname); }
  if (body.avatarColor !== undefined) { updates.push('avatar_color = ?'); params.push(body.avatarColor); }
  if (body.bio !== undefined) { updates.push('bio = ?'); params.push(body.bio); }

  if (updates.length === 0) {
    return json({ error: '没有要更新的字段' }, 400);
  }

  params.push(userId);
  await env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return json({ message: '个人信息已更新' });
}


// ==================== 学习模块 CRUD ====================

const DEFAULT_MODULES = [
  { title:'多边形建模',icon:'🧱',category:'建模',desc:'从基础几何体到复杂角色，掌握多边形建模核心技术',tags:'硬表面, 角色建模, 拓扑优化',difficulty:40,color:'#6ea8fe' },
  { title:'材质与贴图',icon:'🎨',category:'材质',desc:'UV展开、PBR材质制作、Arnold材质节点详解',tags:'UV展开, PBR, Substance',difficulty:55,color:'#f472b6' },
  { title:'灯光与渲染',icon:'💡',category:'渲染',desc:'三点布光、HDRI环境光、Arnold渲染器调优',tags:'三点布光, HDRI, AOV',difficulty:50,color:'#fbbf24' },
  { title:'骨骼绑定',icon:'🦴',category:'绑定',desc:'骨骼系统搭建、IK/FK切换、控制器制作与权重',tags:'IK/FK, 控制器, 权重',difficulty:75,color:'#a78bfa' },
  { title:'角色动画',icon:'🏃',category:'动画',desc:'关键帧动画、走路循环、面部表情与口型同步',tags:'关键帧, 走路循环, 表情',difficulty:70,color:'#34d399' },
  { title:'特效模拟',icon:'🌀',category:'特效',desc:'nParticle粒子、nCloth布料、Bifrost流体',tags:'粒子, 布料, 流体',difficulty:85,color:'#fb923c' },
  { title:'摄像机与镜头',icon:'📷',category:'动画',desc:'镜头语言、景深控制、运动镜头与剪辑节奏',tags:'景深, 运镜, 剪辑',difficulty:45,color:'#22d3ee' },
  { title:'脚本与自动化',icon:'⚡',category:'脚本',desc:'MEL/Python脚本、工具开发、批量渲染',tags:'Python, MEL, 自动化',difficulty:90,color:'#e879f9' },
];

async function getModules(url, userId, env) {
  const filter = url.searchParams.get('filter') || 'all';
  const search = url.searchParams.get('search') || '';

  let sql = 'SELECT * FROM modules WHERE user_id = ?';
  const params = [userId];

  if (filter !== 'all') {
    sql += ' AND category = ?';
    params.push(filter);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR desc LIKE ? OR tags LIKE ?)';
    const kw = '%' + search + '%';
    params.push(kw, kw, kw);
  }
  sql += ' ORDER BY builtin ASC, created_at DESC';

  let results = (await env.DB.prepare(sql).bind(...params).all()).results || [];

  // 首次使用时插入默认内置模块
  const existingCount = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM modules WHERE user_id = ? AND builtin = 1'
  ).bind(userId).first();

  if ((existingCount.cnt || 0) === 0) {
    for (let i = 0; i < DEFAULT_MODULES.length; i++) {
      const m = DEFAULT_MODULES[i];
      await env.DB.prepare(`
        INSERT INTO modules (id, user_id, title, icon, category, desc, tags, difficulty, color, builtin, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).bind(makeId('mod'), userId, m.title, m.icon||'📚', m.category, m.desc||'', m.tags||'', m.difficulty||50, m.color||'#6ea8fe', new Date().toISOString()).run();
    }
    // 重新查询
    results = (await env.DB.prepare(sql).bind(...params).all()).results || [];
  }

  return json(results);
}

async function createModule(userId, req, env) {
  const body = await readBody(req);
  if (!body.title || !body.category) {
    return json({ error: '标题和分类为必填项' }, 400);
  }

  const id = makeId('custom-mod');
  await env.DB.prepare(`
    INSERT INTO modules (id, user_id, title, icon, category, desc, tags, difficulty, color, builtin, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).bind(id, userId, body.title, body.icon||'📚', body.category, body.desc||'', body.tags||'', body.difficulty||50, body.color||'#6ea8fe', new Date().toISOString()).run();

  return json({ id, message: '模块添加成功' }, 201);
}

async function updateModule(id, userId, req, env) {
  const body = await readBody(req);
  const existing = await env.DB.prepare(
    'SELECT id FROM modules WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();
  if (!existing) return json({ error: '模块不存在' }, 404);

  await env.DB.prepare(`
    UPDATE modules SET title=?, icon=?, category=?, desc=?, tags=?, difficulty=?, color=?
    WHERE id=? AND user_id=?
  `).bind(body.title, body.icon||'📚', body.category, body.desc||'', body.tags||'', body.difficulty||50, body.color||'#6ea8fe', id, userId).run();

  return json({ message: '模块已更新' });
}

async function deleteModule(id, userId, env) {
  const result = await env.DB.prepare(
    'DELETE FROM modules WHERE id = ? AND user_id = ?'
  ).bind(id, userId).run();
  if (!result.meta.changes) return json({ error: '模块不存在或不可删除（内置模块）' }, 404);
  return json({ message: '模块已删除' });
}

// ==================== 教程 CRUD ====================

const DEFAULT_TUTORIALS = [
  { title:"Maya 界面与基础操作", cat:"入门", level:"初级", desc:"认识工作区、视图导航、基本工具", link:"#" },
  { title:"多边形建模：道具案例", cat:"建模", level:"初级", desc:"从简单几何体制作低模道具", link:"#" },
  { title:"硬表面建模：机械零件", cat:"建模", level:"中级", desc:"倒角、拓扑技巧，制作精密机械", link:"#" },
  { title:"角色建模：Q版小人", cat:"建模", level:"中级", desc:"从球体组合到完整角色模型", link:"#" },
  { title:"UV展开基础与技巧", cat:"材质", level:"初级", desc:"UV展开原理、接缝摆放和排布优化", link:"#" },
  { title:"PBR材质制作流程", cat:"材质", level:"中级", desc:"Substance Painter联动，写实PBR材质", link:"#" },
  { title:"Arnold材质节点详解", cat:"材质", level:"进阶", desc:"aiStandardSurface节点、SSS皮肤材质", link:"#" },
  { title:"三点布光与灯光类型", cat:"渲染", level:"初级", desc:"主光/辅光/轮廓光，基础布光方法", link:"#" },
  { title:"Arnold渲染器入门", cat:"渲染", level:"中级", desc:"采样设置、AOV分层、渲染优化", link:"#" },
  { title:"HDRI环境光与IBL", cat:"渲染", level:"中级", desc:"HDRI贴图创建逼真环境照明", link:"#" },
  { title:"骨骼系统搭建基础", cat:"绑定", level:"初级", desc:"创建骨骼链、设置层级关系", link:"#" },
  { title:"IK/FK切换与控制器", cat:"绑定", level:"中级", desc:"IK/FK无缝切换、自定义控制器", link:"#" },
  { title:"权重涂抹实战技巧", cat:"绑定", level:"中级", desc:"权重问题解决、镜像权重", link:"#" },
  { title:"关键帧动画基础", cat:"动画", level:"初级", desc:"关键帧设置、图表编辑器、缓动曲线", link:"#" },
  { title:"走路循环动画制作", cat:"动画", level:"中级", desc:"走路力学分析、可循环走路动画", link:"#" },
  { title:"跑步与跳跃动画", cat:"动画", level:"中级", desc:"不同速度下的运动规律和节奏", link:"#" },
  { title:"面部表情与口型同步", cat:"动画", level:"进阶", desc:"BlendShape驱动、唇形同步", link:"#" },
  { title:"nParticle粒子特效", cat:"特效", level:"中级", desc:"火焰、烟雾、魔法粒子效果", link:"#" },
  { title:"nCloth布料模拟", cat:"特效", level:"中级", desc:"角色衣服模拟、布料碰撞", link:"#" },
  { title:"Bifrost流体模拟", cat:"特效", level:"进阶", desc:"液体模拟、泡沫、水花生成", link:"#" },
  { title:"MEL脚本入门", cat:"脚本", level:"中级", desc:"Maya嵌入式语言，自动化操作", link:"#" },
  { title:"Python脚本开发", cat:"脚本", level:"进阶", desc:"maya.cmds API开发自定义工具", link:"#" },
  { title:"镜头语言与运镜", cat:"动画", level:"中级", desc:"推拉摇移、景深控制、镜头节奏", link:"#" },
  { title:"Nuke合成基础", cat:"渲染", level:"进阶", desc:"AOV合成、色彩校正、特效叠加", link:"#" },
];

async function getTutorials(url, userId, env) {
  const filter = url.searchParams.get('filter') || 'all';
  const search = url.searchParams.get('search') || '';

  // 获取用户自定义教程
  let sql = 'SELECT * FROM tutorials WHERE user_id = ?';
  const params = [userId];

  if (filter !== 'all') {
    sql += ' AND cat = ?';
    params.push(filter);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR cat LIKE ? OR desc LIKE ?)';
    const kw = '%' + search + '%';
    params.push(kw, kw, kw);
  }
  sql += ' ORDER BY builtin ASC, created_at DESC';

  const customTuts = await env.DB.prepare(sql).bind(...params).all();
  let results = customTuts.results || [];

  // 合并内置教程（首次或用户无自定义数据时）
  const existingCount = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM tutorials WHERE user_id = ? AND builtin = 1'
  ).bind(userId).first();
  
  if ((existingCount.cnt || 0) === 0) {
    // 插入默认教程为内置教程
    for (let i = 0; i < DEFAULT_TUTORIALS.length; i++) {
      const t = DEFAULT_TUTORIALS[i];
      await env.DB.prepare(`
        INSERT INTO tutorials (id, user_id, title, cat, level, desc, link, builtin, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).bind(makeId('builtin'), userId, t.title, t.cat, t.level, t.desc, t.link, t.created_at || new Date().toISOString()).run();
    }
    // 重新查询
    const all = await env.DB.prepare(sql).bind(...params).all();
    results = all.results || [];
  }

  // 客户端搜索过滤
  let list = results;
  if (search) {
    const kw = search.toLowerCase();
    list = list.filter(t =>
      (t.title + t.cat + t.level + (t.desc || '')).toLowerCase().includes(kw)
    );
  }
  if (filter !== 'all') {
    list = list.filter(t => t.cat === filter);
  }

  return json(list);
}

async function createTutorial(userId, req, env) {
  const body = await readBody(req);
  if (!body.title || !body.cat || !body.level || !body.link) {
    return json({ error: '标题、分类、难度、链接均为必填项' }, 400);
  }

  const id = makeId('custom');
  await env.DB.prepare(`
    INSERT INTO tutorials (id, user_id, title, cat, level, desc, link, builtin, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).bind(id, userId, body.title, body.cat, body.level, body.desc || '', body.link, new Date().toISOString()).run();

  return json({ id, message: '教程添加成功' }, 201);
}

async function updateTutorial(id, userId, req, env) {
  const body = await readBody(req);
  const existing = await env.DB.prepare(
    'SELECT id FROM tutorials WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();
  if (!existing) return json({ error: '教程不存在' }, 404);

  await env.DB.prepare(`
    UPDATE tutorials SET title=?, cat=?, level=?, desc=?, link=?
    WHERE id=? AND user_id=?
  `).bind(body.title, body.cat, body.level, body.desc || '', body.link, id, userId).run();

  return json({ message: '教程已更新' });
}

async function deleteTutorial(id, userId, env) {
  const result = await env.DB.prepare(
    'DELETE FROM tutorials WHERE id = ? AND user_id = ?'
  ).bind(id, userId).run();
  if (!result.meta.changes) return json({ error: '教程不存在' }, 404);
  return json({ message: '教程已删除' });
}

// ==================== 学习路线 ====================

async function getRoadmap(userId, env) {
  const row = await env.DB.prepare(
    'SELECT checks, updated_at FROM roadmap_progress WHERE user_id = ?'
  ).bind(userId).first();
  
  let checks = [];
  if (row) {
    try { checks = JSON.parse(row.checks); } catch { checks = []; }
  }
  // 如果还没有记录，初始化10个阶段
  if (checks.length < 10) {
    checks = Array(10).fill(false);
  }

  return json({ checks, updatedAt: row?.updated_at || null });
}

async function updateRoadmap(userId, req, env) {
  const body = await readBody(req);
  const { checks } = body;
  if (!Array.isArray(checks)) {
    return json({ error: 'checks 必须是数组' }, 400);
  }

  const done = checks.filter(Boolean).length;
  const pct = Math.round(done / checks.length * 100);

  await env.DB.prepare(`
    INSERT INTO roadmap_progress (user_id, checks, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET checks=excluded.checks, updated_at=excluded.updated_at
  `).bind(userId, JSON.stringify(checks), new Date().toISOString()).run();

  return json({ checks, progress: { done, total: checks.length, percent: pct } });
}

// ==================== 错题集 CRUD ====================

const DEFAULT_MISTAKES = [
  { subject:'建模', question:'Maya中如何给多边形添加倒角？我总是找不到倒角工具在哪里。', wrong:'在Edit Mesh菜单里找了半天没找到，以为是Mesh菜单。', correct:'选择边 → Edit Mesh → Bevel（或按快捷键 Ctrl+B），可在属性面板调节分数和圆度。', note:'记住：倒角在Edit Mesh下，不在Mesh下！快捷键Ctrl+B很好用。', mastered:true, date:'2026/4/20', files:[] },
  { subject:'绑定', question:'IK和FK的区别是什么？什么时候该用哪个？', wrong:'觉得IK和FK差不多，随便用一个就行，结果角色走路时脚一直滑动。', correct:'IK（逆向动力学）：拖动控制器自动计算父关节，适合脚踩地面等固定末端场景。\nFK（正向动力学）：手动旋转每个关节，适合挥动手臂等弧线运动。\n角色绑定通常需要IK/FK切换系统。', note:'走路时脚必须用IK！手臂挥动用FK更自然。', mastered:false, date:'2026/4/22', files:[] },
  { subject:'渲染', question:'Arnold渲染出来全是噪点怎么办？', wrong:'以为增加分辨率就能减少噪点，渲染了4小时还是满屏噪点。', correct:'增加Camera(AA)采样值（建议3-5），而不是分辨率。同时检查灯光采样、DOF采样设置。可以用Arnold Render View实时预览调参。', note:'分辨率≠采样！Camera AA才是关键，其他采样看场景需要调。', mastered:false, date:'2026/4/25', files:[] },
  { subject:'动画', question:'走路循环动画中，角色重心总是上下跳动感不对？', wrong:'只做了腿的前后运动，没有做重心的上下和前后位移，看起来像在地上滑行。', correct:'走路时重心有8字形运动轨迹：\n1. 上下：单腿支撑时最高，双腿支撑时最低\n2. 前后：脚落地时重心前移，蹬地时后移\n3. 左右：单腿支撑时重心向支撑腿偏移', note:'先理解走路的力学原理，再K帧！参考理查德·威廉姆斯的《动画师生存工具箱》。', mastered:false, date:'2026/4/26', files:[] },
];

async function getMistakes(url, userId, env) {
  const filter = url.searchParams.get('filter') || 'all';
  const search = url.searchParams.get('search') || '';

  // 检查是否有数据，没有则初始化示例数据
  const countRow = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM mistakes WHERE user_id = ?'
  ).bind(userId).first();
  
  if ((countRow.cnt || 0) === 0) {
    for (const m of DEFAULT_MISTAKES) {
      const id = makeId('mk');
      await env.DB.prepare(`
        INSERT INTO mistakes (id, user_id, subject, question, wrong_answer, correct_answer, note, mastered, date, files, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, userId, m.subject, m.question, m.wrong, m.correct, m.note, m.mastered ? 1 : 0, m.date, JSON.stringify(m.files), new Date().toISOString()).run();
    }
  }

  let sql = 'SELECT * FROM mistakes WHERE user_id = ?';
  const params = [userId];

  if (filter !== 'all') {
    sql += ' AND subject = ?';
    params.push(filter);
  }

  const rows = await env.DB.prepare(sql).bind(...params).all();
  let list = (rows.results || []).map(row => ({
    ...row,
    mastered: !!row.mastered,
    files: parseJsonSafe(row.files),
  }));

  // 客户端搜索过滤
  if (search) {
    const kw = search.toLowerCase();
    list = list.filter(m => 
      (m.subject + m.question + (m.wrong_answer||'') + (m.correct_answer||'') + (m.note||'')).toLowerCase().includes(kw)
    );
  }

  return json(list);
}

async function createMistake(userId, req, env) {
  const body = await readBody(req);
  if (!body.subject || !body.question) {
    return json({ error: '科目和题目描述为必填项' }, 400);
  }

  const id = makeId('mk');
  await env.DB.prepare(`
    INSERT INTO mistakes (id, user_id, subject, question, wrong_answer, correct_answer, note, mastered, date, files, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `).bind(id, userId, body.subject, body.question, body.wrong_answer || '', body.correct_answer || '',
         body.note || '', new Date().toLocaleDateString('zh-CN'),
         JSON.stringify(body.files || []), new Date().toISOString()).run();

  return json({ id, message: '错题添加成功' }, 201);
}

async function updateMistake(id, userId, req, env) {
  const body = await readBody(req);
  const existing = await env.DB.prepare(
    'SELECT id FROM mistakes WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();
  if (!existing) return json({ error: '错题不存在' }, 404);

  await env.DB.prepare(`
    UPDATE mistakes SET subject=?, question=?, wrong_answer=?, correct_answer=?, note=?, files=?
    WHERE id=? AND user_id=?
  `).bind(body.subject, body.question, body.wrong_answer || '', body.correct_address || '',
         body.note || '', JSON.stringify(body.files || []), id, userId).run();

  return json({ message: '错题已更新' });
}

async function deleteMistake(id, userId, env) {
  const result = await env.DB.prepare(
    'DELETE FROM mistakes WHERE id = ? AND user_id = ?'
  ).bind(id, userId).run();
  if (!result.meta.changes) return json({ error: '错题不存在' }, 404);
  return json({ message: '错题已删除' });
}

async function toggleMastered(id, userId, env) {
  const row = await env.DB.prepare(
    'SELECT mastered FROM mistakes WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();
  if (!row) return json({ error: '错题不存在' }, 404);

  const newValue = row.mastered ? 0 : 1;
  await env.DB.prepare(
    'UPDATE mistakes SET mastered = ? WHERE id = ? AND user_id = ?'
  ).bind(newValue, id, userId).run();

  return json({ mastered: !!newValue, message: newValue ? '已标记掌握' : '已取消掌握' });
}

// ==================== 作业存储 CRUD ====================

const DEFAULT_HOMEWORK = [
  { title:'Maya 简易杯子建模', subject:'建模', status:'已批改', deadline:'2026-04-20', score:'92', desc:'使用多边形建模工具创建一个杯子模型，要求：1.使用CV曲线+旋转命令 2.杯壁厚度合理 3.提交.ma源文件', date:'2026/4/18', files:[] },
  { title:'三点布光渲染练习', subject:'渲染', status:'已提交', deadline:'2026-04-28', score:'', desc:'给给定的场景设置三点布光（主光、辅光、轮廓光），使用Arnold渲染器输出1080p图像，要求明暗层次分明、氛围感强。', date:'2026/4/24', files:[] },
  { title:'角色走路循环动画', subject:'动画', status:'进行中', deadline:'2026-05-05', score:'', desc:'制作可循环的角色走路动画，要求：1.至少24帧循环 2.重心有8字形运动 3.手臂有跟随摆动 4.脚不滑动', date:'2026/4/26', files:[] },
  { title:'Python脚本：批量重命名', subject:'脚本', status:'未开始', deadline:'2026-05-10', score:'', desc:'编写一个Maya Python脚本，实现批量重命名选中物体功能，要求：1.支持前缀/后缀添加 2.支持序号替换 3.有简单的UI界面', date:'2026/4/27', files:[] },
  { title:'道具贴图绘制', subject:'材质', status:'进行中', deadline:'2026-05-03', score:'', desc:'为宝箱模型绘制PBR贴图（BaseColor、Normal、Roughness、Metallic），使用Substance Painter制作，导出4张贴图。', date:'2026/4/25', files:[] },
];

async function getHomework(url, userId, env) {
  const filter = url.searchParams.get('filter') || 'all';
  const search = url.searchParams.get('search') || '';

  // 检查是否需要初始化示例数据
  const countRow = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM homework WHERE user_id = ?'
  ).bind(userId).first();
  
  if ((countRow.cnt || 0) === 0) {
    for (const h of DEFAULT_HOMEWORK) {
      const id = makeId('hw');
      await env.DB.prepare(`
        INSERT INTO homework (id, user_id, title, subject, status, deadline, score, desc, date, files, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, userId, h.title, h.subject, h.status, h.deadline, h.score, h.desc, h.date,
             JSON.stringify(h.files || []), new Date().toISOString()).run();
    }
  }

  let sql = 'SELECT * FROM homework WHERE user_id = ?';
  const params = [userId];

  if (filter !== 'all') {
    sql += ' AND status = ?';
    params.push(filter);
  }

  const rows = await env.DB.prepare(sql).bind(...params).all();
  let list = (rows.results || []).map(row => ({
    ...row,
    files: parseJsonSafe(row.files),
  }));

  // 客户端搜索过滤
  if (search) {
    const kw = search.toLowerCase();
    list = list.filter(h => 
      (h.title + h.subject + (h.desc||'')).toLowerCase().includes(kw)
    );
  }

  return json(list);
}

async function createHomework(userId, req, env) {
  const body = await readBody(req);
  if (!body.title || !body.subject) {
    return json({ error: '作业名称和科目为必填项' }, 400);
  }

  const id = makeId('hw');
  await env.DB.prepare(`
    INSERT INTO homework (id, user_id, title, subject, status, deadline, score, desc, date, files, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, userId, body.title, body.subject, body.status || '未开始',
         body.deadline || '', body.score || '', body.desc || '',
         new Date().toLocaleDateString('zh-CN'),
         JSON.stringify(body.files || []), new Date().toISOString()).run();

  return json({ id, message: '作业添加成功' }, 201);
}

async function updateHomework(id, userId, req, env) {
  const body = await readBody(req);
  const existing = await env.DB.prepare(
    'SELECT id FROM homework WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();
  if (!existing) return json({ error: '作业不存在' }, 404);

  await env.DB.prepare(`
    UPDATE homework SET title=?, subject=?, status=?, deadline=?, score=?, desc=?, files=?
    WHERE id=? AND user_id=?
  `).bind(body.title, body.subject, body.status || '未开始', body.deadline || '',
         body.score || '', body.desc || '', JSON.stringify(body.files || []),
         id, userId).run();

  return json({ message: '作业已更新' });
}

async function deleteHomework(id, userId, env) {
  const result = await env.DB.prepare(
    'DELETE FROM homework WHERE id = ? AND user_id = ?'
  ).bind(id, userId).run();
  if (!result.meta.changes) return json({ error: '作业不存在' }, 404);
  return json({ message: '作业已删除' });
}

// ==================== 文件上传/下载（R2）====================

async function uploadFile(userId, req, env) {
  const formData = await req.formData();
  const file = formData.get('file');
  const category = formData.get('category') || 'general';   // mistake / homework / general
  const relatedId = formData.get('relatedId') || '';

  if (!file || !(file instanceof File)) {
    return json({ error: '请选择要上传的文件' }, 400);
  }

  // 文件大小限制 5MB
  if (file.size > 5 * 1024 * 1024) {
    return json({ error: '文件大小不能超过5MB' }, 400);
  }

  // 生成 R2 存储路径
  const ext = file.name.split('.').pop() || '';
  const key = `${userId}/${category}/${makeId('f')}.${ext}`;

  // 上传到 R2
  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  // 记录文件元数据
  await env.DB.prepare(`
    INSERT INTO files (user_id, key, original_name, size, type, category, related_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(userId, key, file.name, file.size, file.type || '', category, relatedId, new Date().toISOString()).run();

  return json({
    key,
    name: file.name,
    size: file.size,
    type: file.type,
    message: '文件上传成功'
  }, 201);
}

async function getFile(key, userId, env) {
  // 验证文件归属
  const record = await env.DB.prepare(
    'SELECT * FROM files WHERE key = ? AND user_id = ?'
  ).bind(key, userId).first();
  if (!record) return json({ error: '文件不存在或无权访问' }, 404);

  const object = await env.BUCKET.get(key);
  if (!object) return json({ error: '文件不存在' }, 404);

  const headers = new Headers(object.httpMetadata || {});
  headers.set('Content-Disposition', `inline; filename="${record.original_name}"`);
  Object.assign(headers, corsHeaders());

  return new Response(object.body, { headers });
}

// ==================== 作业点赞功能 ====================

async function likeHomework(hwId, userId, env) {
  // 检查作业是否存在
  const homework = await env.DB.prepare(
    'SELECT * FROM homework WHERE id = ?'
  ).bind(hwId).first();

  if (!homework) {
    return json({ error: '作业不存在' }, 404);
  }

  // 检查是否已点赞（简单的 likes 字段存储 JSON 数组）
  let likes = parseJsonSafe(homework.likes);
  const userLiked = likes.includes(userId);

  if (userLiked) {
    // 取消点赞
    likes = likes.filter(id => id !== userId);
  } else {
    // 点赞
    likes.push(userId);
  }

  // 更新数据库
  await env.DB.prepare(
    'UPDATE homework SET likes = ? WHERE id = ?'
  ).bind(JSON.stringify(likes), hwId).run();

  return json({
    liked: !userLiked,
    count: likes.length,
    message: !userLiked ? '点赞成功' : '已取消点赞'
  });
}

// ==================== 公开作业（社区广场）====================

async function getPublicHomework(url, env) {
  const page = parseInt(url.searchParams.get('page')) || 1;
  const limit = parseInt(url.searchParams.get('limit')) || 10;
  const filter = url.searchParams.get('filter') || 'all';
  const search = url.searchParams.get('search') || '';
  const offset = (page - 1) * limit;

  let sql = `
    SELECT h.*, u.nickname as author_nickname, u.avatar_color as author_avatar_color
    FROM homework h
    LEFT JOIN users u ON h.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (filter !== 'all') {
    sql += ' AND h.status = ?';
    params.push(filter);
  }

  if (search) {
    sql += ' AND (h.title LIKE ? OR h.subject LIKE ? OR h.desc LIKE ?)';
    const kw = '%' + search + '%';
    params.push(kw, kw, kw);
  }

  sql += ' ORDER BY h.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await env.DB.prepare(sql).bind(...params).all();

  // 解析 JSON 字段
  const list = (results || []).map(row => ({
    ...row,
    files: parseJsonSafe(row.files),
    likes: parseJsonSafe(row.likes),
    _authorNickname: row.author_nickname,
    _authorAvatarColor: row.author_avatar_color,
  }));

  // 获取总数用于分页
  let countSql = 'SELECT COUNT(*) as total FROM homework h WHERE 1=1';
  const countParams = [];
  if (filter !== 'all') {
    countSql += ' AND h.status = ?';
    countParams.push(filter);
  }
  if (search) {
    countSql += ' AND (h.title LIKE ? OR h.subject LIKE ? OR h.desc LIKE ?)';
    const kw = '%' + search + '%';
    countParams.push(kw, kw, kw);
  }
  const countResult = await env.DB.prepare(countSql).bind(...countParams).first();
  const total = countResult?.total || 0;

  return json({
    list,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}

// ==================== 辅助函数 ====================

function parseJsonSafe(str) {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return []; }
}
