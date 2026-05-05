// ============================================================
// 3D动画学院 - 独立 Node.js 服务器（带后端 API）
// 部署: node server.js
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

// ===== Supabase 连接（如果配置了环境变量则启用） =====
let supabase = null;
let USE_SUPABASE = false;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    USE_SUPABASE = true;
    console.log('[✅] 已连接到 Supabase 数据库');
  }
} catch(e) { console.log('[ℹ] 未检测到 Supabase 配置，使用本地数据库'); }

// ===== MIME 类型 =====
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

// ===== 本地数据库管理 =====
function ensureDataDir() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadDB() {
  ensureDataDir();
  try {
    if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) { console.error('读取数据库失败:', e.message); }
  return { users: {}, modules: {}, tutorials: {}, mistakes: {}, homework: {}, roadmap: {}, assets: {} };
}

function saveDB(db) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// ===== 工具函数 =====
function makeId(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function jsonRes(data, status = 200) {
  return { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*' }, body: JSON.stringify(data) };
}

function corsRes() {
  return { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' }, body: '' };
}

function generateToken(userId) {
  return Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000, ts: Date.now() })).toString('base64');
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const d = JSON.parse(Buffer.from(token, 'base64').toString());
    if (!d.uid || !d.exp || Date.now() > d.exp) return null;
    return d.uid;
  } catch { return null; }
}

async function hashPassword(password) {
  return crypto.createHash('sha256').update(password + ':3dacademy-secret-2026').digest('hex');
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
  });
}

function getAuthUser(req) {
  const header = req.headers['authorization'] || '';
  const token = header.replace('Bearer ', '');
  return verifyToken(token);
}

function parseJsonSafe(str) {
  if (!str) return [];
  try { return JSON.parse(str); }
  catch { return []; }
}

// ===== 默认数据初始化 =====
function initDefaults(db, userId) {
  // 默认模块
  if (!db.modules[userId] || db.modules[userId].length === 0) {
    db.modules[userId] = [
      { id:makeId('mod'), user_id:userId, title:'多边形建模',icon:'\uD83E\uDEF1',category:'建模',desc:'从基础几何体到复杂角色，掌握多边形建模核心技术',tags:'硬表面, 角色建模, 拓扑优化',difficulty:40,color:'#6ea8fe',builtin:1 },
      { id:makeId('mod'), user_id:userId, title:'材质与贴图',icon:'\uD83C\uDFA8',category:'材质',desc:'UV展开、PBR材质制作、Arnold材质节点详解',tags:'UV展开, PBR, Substance',difficulty:55,color:'#f472b6',builtin:1 },
      { id:makeId('mod'), user_id:userId, title:'灯光与渲染',icon:'\uD83D\uDCA1',category:'渲染',desc:'三点布光、HDRI环境光、Arnold渲染器调优',tags:'三点布光, HDRI, AOV',difficulty:50,color:'#fbbf24',builtin:1 },
      { id:makeId('mod'), user_id:userId, title:'骨骼绑定',icon:'\uD83E\uDEB4',category:'绑定',desc:'骨骼系统搭建、IK/FK切换、控制器制作与权重',tags:'IK/FK, 控制器, 权重',difficulty:75,color:'#a78bfa',builtin:1 },
      { id:makeId('mod'), user_id:userId, title:'角色动画',icon:'\uD83C\uDFC3',category:'动画',desc:'关键帧动画、走路循环、面部表情与口型同步',tags:'关键帧, 走路循环, 表情',difficulty:70,color:'#34d399',builtin:1 },
      { id:makeId('mod'), user_id:userId, title:'特效模拟',icon:'\uD83C\uDF00',category:'特效',desc:'nParticle粒子、nCloth布料、Bifrost流体',tags:'粒子, 布料, 流体',difficulty:85,color:'#fb923c',builtin:1 },
      { id:makeId('mod'), user_id:userId, title:'摄像机与镜头',icon:'\uD83D\uDCF7',category:'动画',desc:'镜头语言、景深控制、运动镜头与剪辑节奏',tags:'景深, 运镜, 剪辑',difficulty:45,color:'#22d3ee',builtin:1 },
      { id:makeId('mod'), user_id:userId, title:'脚本与自动化',icon:'\u26A1',category:'脚本',desc:'MEL/Python脚本、工具开发、批量渲染',tags:'Python, MEL, 自动化',difficulty:90,color:'#e879f9',builtin:1 },
    ];
  }

  // 默认教程
  if (!db.tutorials[userId] || db.tutorials[userId].length === 0) {
    db.tutorials[userId] = [
      { id:makeId('builtin'), user_id:userId, title:'Maya 界面与基础操作',cat:'入门',level:'初级',desc:'认识工作区、视图导航、基本工具',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'多边形建模：道具案例',cat:'建模',level:'初级',desc:'从简单几何体制作低模道具',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'硬表面建模：机械零件',cat:'建模',level:'中级',desc:'倒角、拓扑技巧，制作精密机械',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'角色建模：Q版小人',cat:'建模',level:'中级',desc:'从球体组合到完整角色模型',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'UV展开基础与技巧',cat:'材质',level:'初级',desc:'UV展开原理、接缝摆放和排布优化',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'PBR材质制作流程',cat:'材质',level:'中级',desc:'Substance Painter联动，写实PBR材质',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'Arnold材质节点详解',cat:'材质',level:'进阶',desc:'aiStandardSurface节点、SSS皮肤材质',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'三点布光与灯光类型',cat:'渲染',level:'初级',desc:'主光/辅光/轮廓光，基础布光方法',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'Arnold渲染器入门',cat:'渲染',level:'中级',desc:'采样设置、AOV分层、渲染优化',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'骨骼系统搭建基础',cat:'绑定',level:'初级',desc:'创建骨骼链、设置层级关系',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'IK/FK切换与控制器',cat:'绑定',level:'中级',desc:'IK/FK无缝切换、自定义控制器',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'权重涂抹实战技巧',cat:'绑定',level:'中级',desc:'权重问题解决、镜像权重',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'关键帧动画基础',cat:'动画',level:'初级',desc:'关键帧设置、图表编辑器、缓动曲线',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'走路循环动画制作',cat:'动画',level:'中级',desc:'走路力学分析、可循环走路动画',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'MEL脚本入门',cat:'脚本',level:'中级',desc:'Maya嵌入式语言，自动化操作',link:'#',builtin:1 },
      { id:makeId('builtin'), user_id:userId, title:'Python脚本开发',cat:'脚本',level:'进阶',desc:'maya.cmds API开发自定义工具',link:'#',builtin:1 },
    ];
  }

  // 默认错题
  if (!db.mistakes[userId] || db.mistakes[userId].length === 0) {
    db.mistakes[userId] = [
      { id:makeId('mk'), user_id:userId, subject:'建模', question:'Maya中如何给多边形添加倒角？我总是找不到倒角工具在哪里。', wrong:'在Edit Mesh菜单里找了半天没找到，以为是Mesh菜单。', correct:'选择边 \u2192 Edit Mesh \u2192 Bevel（或按快捷键 Ctrl+B），可在属性面板调节分数和圆度。', note:'记住：倒角在Edit Mesh下，不在Mesh下！快捷键Ctrl+B很好用。', mastered:true, date:'2026/4/20', files:[] },
      { id:makeId('mk'), user_id:userId, subject:'绑定', question:'IK和FK的区别是什么？什么时候该用哪个？', wrong:'觉得IK和FK差不多，随便用一个就行，结果角色走路时脚一直滑动。', correct:'IK（逆向动力学）：拖动控制器自动计算父关节，适合脚踩地面等固定末端场景。\nFK（正向动力学）：手动旋转每个关节，适合挥动手臂等弧线运动。\n角色绑定通常需要IK/FK切换系统。', note:'走路时脚必须用IK！手臂挥动用FK更自然。', mastered:false, date:'2026/4/22', files:[] },
      { id:makeId('mk'), user_id:userId, subject:'渲染', question:'Arnold渲染出来全是噪点怎么办？', wrong:'以为增加分辨率就能减少噪点，渲染了4小时还是满屏噪点。', correct:'增加Camera(AA)采样值（建议3-5），而不是分辨率。同时检查灯光采样、DOF采样设置。可以用Arnold Render View实时预览调参。', note:'分辨率\u2260采样！Camera AA才是关键，其他采样看场景需要调。', mastered:false, date:'2026/4/25', files:[] },
      { id:makeId('mk'), user_id:userId, subject:'动画', question:'走路循环动画中，角色重心总是上下跳动感不对？', wrong:'只做了腿的前后运动，没有做重心的上下和前后位移，看起来像在地上滑行。', correct:'走路时重心有8字形运动轨迹：\n1. 上下：单腿支撑时最高，双腿支撑时最低\n2. 前后：脚落地时重心前移，蹬地时后移\n3. 左右：单腿支撑时重心向支撑腿偏移', note:'先理解走路的力学原理，再K帧！参考理查德·威廉姆斯的《动画师生存工具箱》。', mastered:false, date:'2026/4/26', files:[] },
    ];
  }

  // 默认作业
  if (!db.homework[userId] || db.homework[userId].length === 0) {
    db.homework[userId] = [
      { id:makeId('hw'), user_id:userId, title:'Maya 简易杯子建模',subject:'建模',status:'已批改',deadline:'2026-04-20',score:'92',desc:'使用多边形建模工具创建一个杯子模型，要求：1.使用CV曲线+旋转命令 2.杯壁厚度合理 3.提交.ma源文件',date:'2026/4/18',files:[] },
      { id:makeId('hw'), user_id:userId, title:'三点布光渲染练习',subject:'渲染',status:'已提交',deadline:'2026-04-28',score:'',desc:'给给定的场景设置三点布光（主光、辅光、轮廓光），使用Arnold渲染器输出1080p图像，要求明暗层次分明、氛围感强。',date:'2026/4/24',files:[] },
      { id:makeId('hw'), user_id:userId, title:'角色走路循环动画',subject:'动画',status:'进行中',deadline:'2026-05-05',score:'',desc:'制作可循环的角色走路动画，要求：1.至少24帧循环 2.重心有8字形运动 3.手臂有跟随摆动 4.脚不滑动',date:'2026/4/26',files:[] },
      { id:makeId('hw'), user_id:userId, title:'Python脚本：批量重命名',subject:'脚本',status:'未开始',deadline:'2026-05-10',score:'',desc:'编写一个Maya Python脚本，实现批量重命名选中物体功能，要求：1.支持前缀/后缀添加 2.支持序号替换 3.有简单的UI界面',date:'2026/4/27',files:[] },
      { id:makeId('hw'), user_id:userId, title:'道具贴图绘制',subject:'材质',status:'进行中',deadline:'2026-05-03',score:'',desc:'为宝箱模型绘制PBR贴图（BaseColor、Normal、Roughness、Metallic），使用Substance Painter制作，导出4张贴图。',date:'2026/4/25',files:[] },
    ];
  }

  // 默认路线进度
  if (!db.roadmap[userId]) {
    db.roadmap[userId] = { checks: Array(10).fill(false), updated_at: new Date().toISOString() };
  }
  
  // 默认素材库
  if (!db.assets[userId]) {
    db.assets[userId] = [];
  }

  saveDB(db);
}

// ==================== API 路由处理 ====================

async function handleAPI(req, url) {
  const pathname = url.pathname;

  // CORS 预检
  if (req.method === 'OPTIONS') return corsRes();

  // 健康检查
  if (pathname === '/api/health' && req.method === 'GET') {
    return jsonRes({ status: 'ok', time: new Date().toISOString(), provider: USE_SUPABASE ? 'supabase-postgresql' : 'node-local-db' });
  }

  // ========== 认证 API ==========
  // 注册
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!body.email || !body.password || !body.nickname) return jsonRes({ error: '邮箱、密码、昵称均为必填项' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return jsonRes({ error: '邮箱格式不正确' }, 400);
    if (body.password.length < 6) return jsonRes({ error: '密码至少6位' }, 400);

    if (USE_SUPABASE) {
      // Supabase 模式
      const { data: existing } = await supabase.from('users').select('id').eq('email', body.email).maybeSingle();
      if (existing) return jsonRes({ error: '该邮箱已被注册' }, 409);
      const id = makeId('user');
      await supabase.from('users').insert([{ id, email: body.email, password_hash: await hashPassword(body.password), nickname: body.nickname, created_at: new Date().toISOString() }]);
      return jsonRes({ message: '注册成功', token: generateToken(id), user: { id, email: body.email, nickname: body.nickname } }, 201);
    }

    // 本地模式
    const db = loadDB();
    const existingUser = Object.values(db.users).find(u => u.email === body.email);
    if (existingUser) return jsonRes({ error: '该邮箱已被注册' }, 409);

    const id = makeId('user');
    const user = {
      id, email: body.email,
      password_hash: await hashPassword(body.password),
      nickname: body.nickname,
      avatar_color: '', bio: '',
      created_at: new Date().toISOString(),
    };
    db.users[id] = user;
    initDefaults(db, id);
    saveDB(db);

    return jsonRes({ message: '注册成功', token: generateToken(id), user: { id, email: user.email, nickname: user.nickname } }, 201);
  }

  // 登录
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!body.email || !body.password) return jsonRes({ error: '请输入邮箱和密码' }, 400);

    if (USE_SUPABASE) {
      const { data: user } = await supabase.from('users').select('*').eq('email', body.email).maybeSingle();
      if (!user) return jsonRes({ error: '邮箱或密码错误' }, 401);
      const inputHash = await hashPassword(body.password);
      if (inputHash !== user.password_hash) return jsonRes({ error: '邮箱或密码错误' }, 401);
      return jsonRes({
        message: '登录成功',
        token: generateToken(user.id),
        user: { id: user.id, email: user.email, nickname: user.nickname, avatarColor: user.avatar_color, bio: user.bio }
      });
    }

    const db = loadDB();
    const user = Object.values(db.users).find(u => u.email === body.email);
    if (!user) return jsonRes({ error: '邮箱或密码错误' }, 401);

    const inputHash = await hashPassword(body.password);
    if (inputHash !== user.password_hash) return jsonRes({ error: '邮箱或密码错误' }, 401);

    return jsonRes({
      message: '登录成功',
      token: generateToken(user.id),
      user: { id: user.id, email: user.email, nickname: user.nickname, avatarColor: user.avatar_color, bio: user.bio }
    });
  }

  // 登出
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    return jsonRes({ message: '已退出登录' });
  }

  // 用户资料
  if (pathname === '/api/user/profile') {
    const userId = getAuthUser(req);
    if (!userId) return jsonRes({ error: '未登录' }, 401);

    if (USE_SUPABASE) {
      const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (!user) return jsonRes({ error: '用户不存在' }, 404);
      if (req.method === 'GET') { return jsonRes({ id: user.id, email: user.email, nickname: user.nickname, avatar_color: user.avatar_color, bio: user.bio, created_at: user.created_at }); }
      if (req.method === 'PUT') {
        const body = await parseBody(req);
        await supabase.from('users').update({
          nickname: body.nickname ?? user.nickname,
          avatar_color: body.avatarColor ?? user.avatar_color,
          bio: body.bio ?? user.bio
        }).eq('id', userId);
        return jsonRes({ message: '个人信息已更新' });
      }
    }

    const db = loadDB();
    const user = db.users[userId];
    if (!user) return jsonRes({ error: '用户不存在' }, 404);

    if (req.method === 'GET') {
      return jsonRes({ id: user.id, email: user.email, nickname: user.nickname, avatar_color: user.avatar_color, bio: user.bio, created_at: user.created_at });
    }
    if (req.method === 'PUT') {
      const body = await parseBody(req);
      if (body.nickname !== undefined) user.nickname = body.nickname;
      if (body.avatarColor !== undefined) user.avatar_color = body.avatarColor;
      if (body.bio !== undefined) user.bio = body.bio;
      db.users[userId] = user;
      saveDB(db);
      return jsonRes({ message: '个人信息已更新' });
    }
  }

// ========== 作业 CRUD ==========
// 社区广场：公开查看所有用户的作业（无需认证，必须放在认证检查前面）
if (pathname === '/api/homework/public' && req.method === 'GET') {
  // 辅助函数：解析作业的 files 字段
  function parseHwFiles(hw) {
    if (!hw) return hw;
    if (Array.isArray(hw.files)) return hw;
    if (typeof hw.files === 'string' && hw.files.trim()) {
      try { hw.files = JSON.parse(hw.files); } catch(e) { hw.files = []; }
    } else { hw.files = []; }
    return hw;
  }

  if (USE_SUPABASE) {
    const { data: allHw } = await supabase.from('homework').select('*').order('created_at', { ascending: false });
    let result = (allHw || []).map(parseHwFiles);
    const authorIds = [...new Set(result.map(h => h.user_id))];
    if (authorIds.length > 0) {
      const { data: authors } = await supabase.from('users').select('id,nickname,email,avatar_color').in('id', authorIds);
      const authorMap = {};
      (authors||[]).forEach(a => { authorMap[a.id] = a; });
      result = result.map(h => ({
        ...h,
        _authorId: h.user_id,
        _authorNickname: authorMap[h.user_id] ? (authorMap[h.user_id].nickname || authorMap[h.user_id].email.split('@')[0]) : '匿名',
        _authorAvatarColor: authorMap[h.user_id]?.avatar_color || '#6ea8fe'
      }));
    }
    let filter = url.searchParams.get('filter') || 'all';
    let search = url.searchParams.get('search') || '';
    if (filter !== 'all') result = result.filter(h => h.status === filter);
    if (search) { const kw = search.toLowerCase(); result = result.filter(h => (h.title+h.subject+(h.desc||'')).toLowerCase().includes(kw)); }
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    return jsonRes({ list: result.slice((page-1)*pageSize, page*pageSize), total: result.length, page, totalPages: Math.ceil(result.length/pageSize) });
  }

  // 本地模式
  const pubDb = loadDB();
  const allHomework = [];
  for (const [uid, hwList] of Object.entries(pubDb.homework || {})) {
    const user = pubDb.users[uid];
    const nickname = user ? (user.nickname || user.email.split('@')[0]) : '匿名用户';
    const avatarColor = user ? (user.avatar_color || '#6ea8fe') : '#6ea8fe';
    for (const hw of (hwList || [])) { allHomework.push({ ...hw, _authorId: uid, _authorNickname: nickname, _authorAvatarColor: avatarColor }); }
  }
  allHomework.sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0));
  let filter = url.searchParams.get('filter') || 'all';
  let search = url.searchParams.get('search') || '';
  let result = allHomework;
  if (filter !== 'all') result = result.filter(h => h.status === filter);
  if (search) { const kw = search.toLowerCase(); result = result.filter(h => (h.title+h.subject+(h.desc||'')).toLowerCase().includes(kw)); }
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  return jsonRes({ list: result.slice((page-1)*pageSize, page*pageSize), total: result.length, page, totalPages: Math.ceil(result.length/pageSize) });
}

// 以下所有路由需要认证
const userId = getAuthUser(req);
if (!userId) return jsonRes({ error: '未登录' }, 401);

const db = loadDB();

  // 确保 defaults 初始化
  initDefaults(db, userId);

  // ========== 模块 CRUD ==========
  if (pathname.match(/^\/api\/modules(?:\/.*)?$/)) {
    const idMatch = pathname.match(/^\/api\/modules\/(.+)$/);
    const id = idMatch ? decodeURIComponent(idMatch[1]) : null;

    // ===== Supabase 模式 =====
    if (USE_SUPABASE) {
      if (req.method === 'GET' && !id) {
        let q = supabase.from('modules').select('*').eq('user_id', userId);
        let filter = url.searchParams.get('filter') || 'all';
        let search = url.searchParams.get('search') || '';
        if (filter !== 'all') q = q.eq('category', filter);
        const { data: list } = await q;
        let result = list || [];
        if (search) { const kw = search.toLowerCase(); result = result.filter(m => (m.title+m.desc+(m.tags||'')).toLowerCase().includes(kw)); }
        return jsonRes(result);
      }
      if (req.method === 'POST' && !id) {
        const body = await parseBody(req);
        if (!body.title || !body.category) return jsonRes({ error: '标题和分类为必填项' }, 400);
        const newId = makeId('custom-mod');
        await supabase.from('modules').insert([{ id: newId, user_id: userId, title: body.title, icon: body.icon||'📚', category: body.category, desc: body.desc||'', tags: body.tags||'', difficulty: body.difficulty||50, color: body.color||'#6ea8fe', builtin: 0, created_at: new Date().toISOString() }]);
        const { data: newItem } = await supabase.from('modules').select('*').eq('id', newId).maybeSingle();
        return jsonRes(newItem, 201);
      }
      if (req.method === 'PUT' && id) {
        const body = await parseBody(req);
        await supabase.from('modules').update({ title: body.title, icon: body.icon, category: body.category, desc: body.desc, tags: body.tags, difficulty: body.difficulty, color: body.color }).eq('id', id).eq('user_id', userId);
        const { data: updated } = await supabase.from('modules').select('*').eq('id', id).maybeSingle();
        return jsonRes(updated);
      }
      if (req.method === 'DELETE' && id) {
        const { data: existing } = await supabase.from('modules').select('builtin').eq('id', id).eq('user_id', userId).maybeSingle();
        if (!existing) return jsonRes({ error: '模块不存在' }, 404);
        if (existing.builtin) return jsonRes({ error: '内置模块不可删除' }, 404);
        await supabase.from('modules').delete().eq('id', id);
        return jsonRes({ message: '模块已删除' });
      }
      return; // Supabase 模式处理完毕
    }

    // 本地模式
    const list = db.modules[userId] || [];

    if (req.method === 'GET' && !id) {
      let filter = url.searchParams.get('filter') || 'all';
      let search = url.searchParams.get('search') || '';
      let result = list;
      if (filter !== 'all') result = result.filter(m => m.category === filter);
      if (search) { const kw = search.toLowerCase(); result = result.filter(m => (m.title+m.desc+m.tags||'').toLowerCase().includes(kw)); }
      return jsonRes(result);
    }
    if (req.method === 'POST' && !id) {
      const body = await parseBody(req);
      if (!body.title || !body.category) return jsonRes({ error: '标题和分类为必填项' }, 400);
      const newItem = { id: makeId('custom-mod'), user_id: userId, title: body.title, icon: body.icon||'\uD83D\uDCDA', category: body.category, desc: body.desc||'', tags: body.tags||'', difficulty: body.difficulty||50, color: body.color||'#6ea8fe', builtin: 0, created_at: new Date().toISOString() };
      list.push(newItem); db.modules[userId] = list; saveDB(db);
      return jsonRes(newItem, 201);
    }
    if (req.method === 'PUT' && id) {
      const body = await parseBody(req);
      const idx = list.findIndex(m => m.id === id);
      if (idx < 0) return jsonRes({ error: '模块不存在' }, 404);
      Object.assign(list[idx], { title: body.title, icon: body.icon, category: body.category, desc: body.desc, tags: body.tags, difficulty: body.difficulty, color: body.color });
      saveDB(db);
      return jsonRes(list[idx]);
    }
    if (req.method === 'DELETE' && id) {
      const idx = list.findIndex(m => m.id === id);
      if (idx < 0) return jsonRes({ error: '模块不存在或不可删除（内置模块）' }, 404);
      if (list[idx].builtin) return jsonRes({ error: '内置模块不可删除' }, 404);
      list.splice(idx, 1); db.modules[userId] = list; saveDB(db);
      return jsonRes({ message: '模块已删除' });
    }
  }

  // ========== 教程 CRUD ==========
  if (pathname.match(/^\/api\/tutorials(?:\/.*)?$/)) {
    const idMatch = pathname.match(/^\/api\/tutorials\/(.+)$/);
    const id = idMatch ? decodeURIComponent(idMatch[1]) : null;

    if (USE_SUPABASE) {
      if (req.method === 'GET' && !id) {
        let q = supabase.from('tutorials').select('*').eq('user_id', userId);
        let filter = url.searchParams.get('filter') || 'all';
        let search = url.searchParams.get('search') || '';
        if (filter !== 'all') q = q.eq('cat', filter);
        const { data: list } = await q;
        let result = list || [];
        if (search) { const kw = search.toLowerCase(); result = result.filter(t => (t.title+t.cat+t.level+(t.desc||'')).toLowerCase().includes(kw)); }
        return jsonRes(result);
      }
      if (req.method === 'POST' && !id) {
        const body = await parseBody(req);
        if (!body.title || !body.cat || !body.level || !body.link) return jsonRes({ error: '标题、分类、难度、链接均为必填项' }, 400);
        const newId = makeId('custom');
        await supabase.from('tutorials').insert([{ id: newId, user_id: userId, title: body.title, cat: body.cat, level: body.level, desc: body.desc||'', link: body.link, builtin: 0, created_at: new Date().toISOString() }]);
        const { data: newItem } = await supabase.from('tutorials').select('*').eq('id', newId).maybeSingle();
        return jsonRes(newItem, 201);
      }
      if (req.method === 'PUT' && id) {
        const body = await parseBody(req);
        await supabase.from('tutorials').update({ title: body.title, cat: body.cat, level: body.level, desc: body.desc, link: body.link }).eq('id', id).eq('user_id', userId);
        const { data: updated } = await supabase.from('tutorials').select('*').eq('id', id).maybeSingle();
        return jsonRes(updated);
      }
      if (req.method === 'DELETE' && id) {
        await supabase.from('tutorials').delete().eq('id', id).eq('user_id', userId);
        return jsonRes({ message: '教程已删除' });
      }
      return;
    }

    // 本地模式
    const list = db.tutorials[userId] || [];

    if (req.method === 'GET' && !id) {
      let filter = url.searchParams.get('filter') || 'all';
      let search = url.searchParams.get('search') || '';
      let result = list;
      if (filter !== 'all') result = result.filter(t => t.cat === filter);
      if (search) { const kw = search.toLowerCase(); result = result.filter(t => (t.title+t.cat+t.level+(t.desc||'')).toLowerCase().includes(kw)); }
      return jsonRes(result);
    }
    if (req.method === 'POST' && !id) {
      const body = await parseBody(req);
      if (!body.title || !body.cat || !body.level || !body.link) return jsonRes({ error: '标题、分类、难度、链接均为必填项' }, 400);
      const newItem = { id: makeId('custom'), user_id: userId, title: body.title, cat: body.cat, level: body.level, desc: body.desc||'', link: body.link, builtin: 0, created_at: new Date().toISOString() };
      list.push(newItem); db.tutorials[userId] = list; saveDB(db);
      return jsonRes(newItem, 201);
    }
    if (req.method === 'PUT' && id) {
      const body = await parseBody(req);
      const idx = list.findIndex(t => t.id === id);
      if (idx < 0) return jsonRes({ error: '教程不存在' }, 404);
      Object.assign(list[idx], { title: body.title, cat: body.cat, level: body.level, desc: body.desc, link: body.link });
      saveDB(db);
      return jsonRes(list[idx]);
    }
    if (req.method === 'DELETE' && id) {
      const idx = list.findIndex(t => t.id === id);
      if (idx < 0) return jsonRes({ error: '教程不存在' }, 404);
      list.splice(idx, 1); db.tutorials[userId] = list; saveDB(db);
      return jsonRes({ message: '教程已删除' });
    }
  }

  // ========== 学习路线 ==========
  if (pathname === '/api/roadmap') {
    const rp = db.roadmap[userId] || { checks: Array(10).fill(false) };
    if (req.method === 'GET') return jsonRes({ checks: rp.checks, updatedAt: rp.updated_at || null });
    if (req.method === 'PUT') {
      const body = await parseBody(req);
      if (!Array.isArray(body.checks)) return jsonRes({ error: 'checks 必须是数组' }, 400);
      const done = body.checks.filter(Boolean).length;
      db.roadmap[userId] = { checks: body.checks, updated_at: new Date().toISOString() };
      saveDB(db);
      return jsonRes({ checks: body.checks, progress: { done, total: body.checks.length, percent: Math.round(done / body.checks.length * 100) } });
    }
  }

  // ========== 错题集 CRUD ==========
  if (pathname.match(/^\/api\/mistakes(?:\/.*)?$/)) {
    const mkMatch = pathname.match(/^\/api\/mistakes\/([^/]+)(?:\/(master))?$/);
    const id = mkMatch ? decodeURIComponent(mkMatch[1]) : null;
    const action = mkMatch ? mkMatch[2] : null;
    const list = db.mistakes[userId] || [];

    if (req.method === 'GET' && !id && !action) {
      let filter = url.searchParams.get('filter') || 'all';
      let search = url.searchParams.get('search') || '';
      let result = [...list];
      if (filter !== 'all') result = result.filter(m => m.subject === filter);
      if (search) { const kw = search.toLowerCase(); result = result.filter(m => (m.subject+m.question+(m.wrong||'')+(m.correct||'')+(m.note||'')).toLowerCase().includes(kw)); }
      return jsonRes(result);
    }
    if (req.method === 'POST' && !id) {
      const body = await parseBody(req);
      if (!body.subject || !body.question) return jsonRes({ error: '科目和题目描述为必填项' }, 400);
      const newItem = { id: makeId('mk'), user_id: userId, subject: body.subject, question: body.question, wrong_answer: body.wrong_answer||'', correct_answer: body.correct_answer||'', note: body.note||'', mastered: false, date: new Date().toLocaleDateString('zh-CN'), files: body.files||[], created_at: new Date().toISOString() };
      list.push(newItem); db.mistakes[userId] = list; saveDB(db);
      return jsonRes(newItem, 201);
    }
    if (req.method === 'PUT' && id) {
      const body = await parseBody(req);
      const idx = list.findIndex(m => m.id === id);
      if (idx < 0) return jsonRes({ error: '错题不存在' }, 404);
      Object.assign(list[idx], { subject: body.subject, question: body.question, wrong_answer: body.wrong_answer||'', correct_answer: body.correct_answer||'', note: body.note||'', files: body.files||list[idx].files });
      saveDB(db);
      return jsonRes(list[idx]);
    }
    if (req.method === 'DELETE' && id) {
      const idx = list.findIndex(m => m.id === id);
      if (idx < 0) return jsonRes({ error: '错题不存在' }, 404);
      list.splice(idx, 1); db.mistakes[userId] = list; saveDB(db);
      return jsonRes({ message: '错题已删除' });
    }
    if (req.method === 'PATCH' && id && action === 'master') {
      const idx = list.findIndex(m => m.id === id);
      if (idx < 0) return jsonRes({ error: '错题不存在' }, 404);
      list[idx].mastered = !list[idx].mastered; saveDB(db);
      return jsonRes(list[idx]);
    }
  }

  // ========== 作业 CRUD ==========
  // 点赞/取消点赞作业
  if (pathname.match(/^\/api\/homework\/([^/]+)\/like$/) && req.method === 'POST') {
    const hwMatch = pathname.match(/^\/api\/homework\/([^/]+)\/like$/);
    const hwId = decodeURIComponent(hwMatch[1]);
    const userIdLike = getAuthUser(req);
    if (!userIdLike) return jsonRes({ error: '未登录' }, 401);

    if (USE_SUPABASE) {
      // Supabase 模式
      const { data: targetHw } = await supabase.from('homework').select('*').eq('id', hwId).maybeSingle();
      if (!targetHw) return jsonRes({ error: '作业不存在' }, 404);
      const likes = parseJsonSafe(targetHw._likes || '[]');
      const idx = likes.indexOf(userIdLike);
      let liked;
      if (idx >= 0) { likes.splice(idx, 1); liked = false; }
      else { likes.push(userIdLike); liked = true; }
      await supabase.from('homework').update({ _likes: JSON.stringify(likes) }).eq('id', hwId);
      return jsonRes({ liked, count: likes.length });
    }

    // 本地模式
    const db = loadDB();
    // 查找该作业属于哪个用户
    let targetHw = null, targetUid = null;
    for (const [uid, hwList] of Object.entries(db.homework || {})) {
      const found = (hwList||[]).find(h => h.id === hwId);
      if(found){ targetHw=found; targetUid=uid; break; }
    }
    if (!targetHw) return jsonRes({ error: '作业不存在' }, 404);

    if (!targetHw._likes) targetHw._likes = [];
    const idx = targetHw._likes.indexOf(userIdLike);
    if (idx >= 0) { targetHw._likes.splice(idx, 1); } 
    else { targetHw._likes.push(userIdLike); }
    db.homework[targetUid] = db.homework[targetUid] || [];
    saveDB(db);
    return jsonRes({ liked: idx < 0, count: targetHw._likes.length });
  }

  if (pathname.match(/^\/api\/homework(?:\/.*)?$/)) {
    const hwMatch = pathname.match(/^\/api\/homework\/([^/?]+)/);
    const id = hwMatch ? decodeURIComponent(hwMatch[1]) : null;

    // ===== Supabase 模式 =====
    if (USE_SUPABASE) {
      // GET 个人作业列表
      if (req.method === 'GET' && !id) {
        let q = supabase.from('homework').select('*').eq('user_id', userId);
        const { data: list } = await q;
        let result = (list || []).map(parseHwFiles);
        let filter = url.searchParams.get('filter') || 'all';
        let search = url.searchParams.get('search') || '';
        if (filter !== 'all') result = result.filter(h => h.status === filter);
        if (search) { const kw = search.toLowerCase(); result = result.filter(h => (h.title+h.subject+(h.desc||'')).toLowerCase().includes(kw)); }
        return jsonRes(result);
      }
      // POST 创建作业
      if (req.method === 'POST' && !id) {
        const body = await parseBody(req);
        if (!body.title || !body.subject) return jsonRes({ error: '作业名称和科目为必填项' }, 400);
        const newId = makeId('hw');
        const filesJson = JSON.stringify(body.files || []);
        await supabase.from('homework').insert([{ id: newId, user_id: userId, title: body.title, subject: body.subject, status: body.status||'未开始', deadline: body.deadline||'', score: body.score||'', desc: body.desc||'', date: new Date().toLocaleDateString('zh-CN'), files: filesJson, created_at: new Date().toISOString() }]);
        const { data: newItem } = await supabase.from('homework').select('*').eq('id', newId).maybeSingle();
        return jsonRes(newItem, 201);
      }
      // PUT 更新作业
      if (req.method === 'PUT' && id) {
        const body = await parseBody(req);
        const { data: existing } = await supabase.from('homework').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
        if (!existing) return jsonRes({ error: '作业不存在' }, 404);
        const filesJson = JSON.stringify(body.files !== undefined ? body.files : parseJsonSafe(existing.files));
        await supabase.from('homework').update({
          title: body.title, subject: body.subject,
          status: body.status || existing.status,
          deadline: body.deadline !== undefined ? body.deadline : existing.deadline,
          score: body.score !== undefined ? body.score : existing.score,
          desc: body.desc !== undefined ? body.desc : existing.desc,
          files: filesJson
        }).eq('id', id);
        const { data: updated } = await supabase.from('homework').select('*').eq('id', id).maybeSingle();
        return jsonRes(updated);
      }
      // DELETE 删除作业
      if (req.method === 'DELETE' && id) {
        const { data: existing } = await supabase.from('homework').select('id').eq('id', id).eq('user_id', userId).maybeSingle();
        if (!existing) return jsonRes({ error: '作业不存在' }, 404);
        await supabase.from('homework').delete().eq('id', id);
        return jsonRes({ message: '作业已删除' });
      }
      return; // Supabase 模式处理完毕
    }

    // 本地模式
    const list = db.homework[userId] || [];

    if (req.method === 'GET' && !id) {
      let filter = url.searchParams.get('filter') || 'all';
      let search = url.searchParams.get('search') || '';
      let result = [...list];
      if (filter !== 'all') result = result.filter(h => h.status === filter);
      if (search) { const kw = search.toLowerCase(); result = result.filter(h => (h.title+h.subject+(h.desc||'')).toLowerCase().includes(kw)); }
      return jsonRes(result);
    }
    if (req.method === 'POST' && !id) {
      const body = await parseBody(req);
      if (!body.title || !body.subject) return jsonRes({ error: '作业名称和科目为必填项' }, 400);
      const newItem = { id: makeId('hw'), user_id: userId, title: body.title, subject: body.subject, status: body.status||'\u672A\u5F00\u59CB', deadline: body.deadline||'', score: body.score||'', desc: body.desc||'', date: new Date().toLocaleDateString('zh-CN'), files: body.files||[], created_at: new Date().toISOString() };
      list.push(newItem); db.homework[userId] = list; saveDB(db);
      return jsonRes(newItem, 201);
    }
    if (req.method === 'PUT' && id) {
      const body = await parseBody(req);
      const idx = list.findIndex(h => h.id === id);
      if (idx < 0) return jsonRes({ error: '作业不存在' }, 404);
      Object.assign(list[idx], { title: body.title, subject: body.subject, status: body.status||'\u672A\u5F00\u59CB', deadline: body.deadline||'', score: body.score||'', desc: body.desc||'', files: body.files||list[idx].files });
      saveDB(db);
      return jsonRes(list[idx]);
    }
    if (req.method === 'DELETE' && id) {
      const idx = list.findIndex(h => h.id === id);
      if (idx < 0) return jsonRes({ error: '作业不存在' }, 404);
      list.splice(idx, 1); db.homework[userId] = list; saveDB(db);
      return jsonRes({ message: '作业已删除' });
    }
  }

  // ========== 素材存储 CRUD ==========
  if (pathname.match(/^\/api\/assets(?:\/.*)?$/)) {
    const assetMatch = pathname.match(/^\/api\/assets\/([^/?]+)/);
    const id = assetMatch ? decodeURIComponent(assetMatch[1]) : null;
    const list = db.assets[userId] || [];

    if (req.method === 'GET' && !id) {
      let filter = url.searchParams.get('filter') || 'all';
      let search = url.searchParams.get('search') || '';
      let result = [...list];
      if (filter !== 'all') result = result.filter(a => a.category === filter);
      if (search) { const kw = search.toLowerCase(); result = result.filter(a => (a.name+a.desc+a.tags||'').toLowerCase().includes(kw)); }
      return jsonRes(result);
    }
    if (req.method === 'POST' && !id) {
      const body = await parseBody(req);
      if (!body.name || !body.category) return jsonRes({ error: '素材名称和分类为必填项' }, 400);
      if (!body.file) return jsonRes({ error: '请选择要上传的文件' }, 400);
      const newItem = { id: makeId('asset'), user_id: userId, name: body.name, category: body.category, tags: body.tags||'', desc: body.desc||'', file: body.file, downloads: 0, date: new Date().toLocaleDateString('zh-CN'), created_at: new Date().toISOString() };
      list.push(newItem); db.assets[userId] = list; saveDB(db);
      return jsonRes(newItem, 201);
    }
    if (req.method === 'PUT' && id) {
      const body = await parseBody(req);
      const idx = list.findIndex(a => a.id === id);
      if (idx < 0) return jsonRes({ error: '素材不存在' }, 404);
      Object.assign(list[idx], { name: body.name, category: body.category, tags: body.tags, desc: body.desc, file: body.file || list[idx].file });
      saveDB(db);
      return jsonRes(list[idx]);
    }
    if (req.method === 'DELETE' && id) {
      const idx = list.findIndex(a => a.id === id);
      if (idx < 0) return jsonRes({ error: '素材不存在' }, 404);
      list.splice(idx, 1); db.assets[userId] = list; saveDB(db);
      return jsonRes({ message: '素材已删除' });
    }
  }

  // ========== 文件上传 ==========
  if (pathname === '/api/upload' && req.method === 'POST') {
    // 接收 base64 文件数据并返回
    const body = await parseBody(req);
    if (!body.file) return jsonRes({ error: '请提供文件数据' }, 400);
    return jsonRes({ key: makeId('f'), name: body.name || 'file', size: body.size || 0, type: body.type || '', data: body.data || body.file, message: '文件上传成功（本地模式）' }, 201);
  }

  // 404
  return jsonRes({ error: 'API 路径不存在: ' + pathname }, 404);
}

// ==================== 静态文件服务 ====================
function serveStatic(filePath) {
  const fullPath = path.join(__dirname, filePath);
  if (!fullPath.startsWith(__dirname)) return null; // 安全检查

  try {
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(fullPath);
      return { status: 200, headers: { 'Content-Type': contentType }, body: content };
    }
  } catch (e) { console.error('静态文件错误:', e.message); }
  return null;
}

// ==================== HTTP 服务器 ====================
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // API 路由
  if (url.pathname.startsWith('/api/')) {
    try {
      const result = await handleAPI(req, url);
      res.writeHead(result.status, result.headers);
      res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
    } catch (err) {
      console.error('API Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '服务器内部错误', detail: err.message }));
    }
    return;
  }

  // 静态文件
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const staticResult = serveStatic(decodeURIComponent(filePath));

  if (staticResult) {
    res.writeHead(staticResult.status, staticResult.headers);
    res.end(staticResult.body);
  } else {
    // SPA fallback: 所有非 API 路由都返回 index.html
    const indexResult = serveStatic('index.html');
    if (indexResult) {
      res.writeHead(indexResult.status, indexResult.headers);
      res.end(indexResult.body);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
});

server.listen(PORT, () => {
  console.log('\n========================================');
  console.log('  🎨 3D动画学院 - 服务器启动成功!');
  console.log('  地址: http://localhost:' + PORT);
  console.log('  数据库: ' + (USE_SUPABASE ? '✅ Supabase PostgreSQL (云端持久化)' : DB_FILE));
  console.log('========================================\n\n');
});
