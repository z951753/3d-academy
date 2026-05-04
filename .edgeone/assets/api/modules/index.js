// ============================================================
// 学习模块 CRUD - /api/modules & /api/modules/:id
// ============================================================
const { getSupabase, json, makeId, auth, parseJsonSafe } = require('../_lib');

const DEFAULT_MODULES = [
  {title:'多边形建模',icon:'🧱',category:'建模',desc:'从基础几何体到复杂角色，掌握多边形建模核心技术',tags:'硬表面, 角色建模, 拓扑优化',difficulty:40,color:'#6ea8fe'},
  {title:'材质与贴图',icon:'🎨',category:'材质',desc:'UV展开、PBR材质制作、Arnold材质节点详解',tags:'UV展开, PBR, Substance',difficulty:55,color:'#f472b6'},
  {title:'灯光与渲染',icon:'💡',category:'渲染',desc:'三点布光、HDRI环境光、Arnold渲染器调优',tags:'三点布光, HDRI, AOV',difficulty:50,color:'#fbbf24'},
  {title:'骨骼绑定',icon:'🦴',category:'绑定',desc:'骨骼系统搭建、IK/FK切换、控制器制作与权重',tags:'IK/FK, 控制器, 权重',difficulty:75,color:'#a78bfa'},
  {title:'角色动画',icon:'🏃',category:'动画',desc:'关键帧动画、走路循环、面部表情与口型同步',tags:'关键帧, 走路循环, 表情',difficulty:70,color:'#34d399'},
  {title:'特效模拟',icon:'🌀',category:'特效',desc:'nParticle粒子、nCloth布料、Bifrost流体',tags:'粒子, 布料, 流体',difficulty:85,color:'#fb923c'},
  {title:'摄像机与镜头',icon:'📷',category:'动画',desc:'镜头语言、景深控制、运动镜头与剪辑节奏',tags:'景深, 运镜, 剪辑',difficulty:45,color:'#22d3ee'},
  {title:'脚本与自动化',icon:'⚡',category:'脚本',desc:'MEL/Python脚本、工具开发、批量渲染',tags:'Python, MEL, 自动化',difficulty:90,color:'#e879f9'},
];

async function ensureDefaultModules(supabase, userId) {
  const { count } = await supabase.from('modules').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('builtin', 1);
  if ((count || 0) > 0) return;

  for (var i = 0; i < DEFAULT_MODULES.length; i++) {
    var m = DEFAULT_MODULES[i];
    await supabase.from('modules').insert([{
      id: makeId('mod'), user_id: userId, title: m.title,
      icon: m.icon || '📚', category: m.category, desc: m.desc || '',
      tags: m.tags || '', difficulty: m.difficulty || 50,
      color: m.color || '#6ea8fe', builtin: 1,
      created_at: new Date().toISOString()
    }]);
  }
}

module.exports = async function handler(req) {
  if (req.method === 'OPTIONS') return { status: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };

  var userId = await auth(req);
  if (!userId) return json({ error: '未登录' }, 401);

  // 提取 URL 中的 ID（Vercel query 参数）
  var urlPath = req.url || '';
  var idMatch = urlPath.match(/\/api\/modules\/([^\/?]+)/);
  var id = idMatch ? decodeURIComponent(idMatch[1]) : null;

  var url = new URL(req.url || '', 'http://localhost');
  var filter = url.searchParams.get('filter') || 'all';
  var search = url.searchParams.get('search') || '';

  const supabase = getSupabase();
  await ensureDefaultModules(supabase, userId);

  if (req.method === 'GET') {
    var query = supabase.from('modules').select('*').eq('user_id', userId).order('builtin', { ascending: true }).order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('category', filter);
    var { data } = await query;
    if (search && data) {
      var kw = search.toLowerCase();
      data = data.filter(function(m) { return (m.title+m.desc+m.tags).toLowerCase().includes(kw); });
    }
    return json(data || []);
  }

  var body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

  if (req.method === 'POST') {
    if (!body.title || !body.category) return json({ error: '标题和分类为必填项' }, 400);
    var newId = makeId('custom-mod');
    await supabase.from('modules').insert([{
      id: newId, user_id: userId, title: body.title,
      icon: body.icon || '📚', category: body.category,
      desc: body.desc || '', tags: body.tags || '',
      difficulty: body.difficulty || 50, color: body.color || '#6ea8fe',
      builtin: 0, created_at: new Date().toISOString()
    }]);
    return json({ id: newId, message: '模块添加成功' }, 201);
  }

  if (req.method === 'PUT' && id) {
    var existing = await supabase.from('modules').select('id').eq('id', id).eq('user_id', userId).maybeSingle();
    if (!existing.data) return json({ error: '模块不存在' }, 404);
    await supabase.from('modules').update({
      title: body.title, icon: body.icon||'📚', category: body.category,
      desc: body.desc||'', tags: body.tags||'', difficulty: body.difficulty||50,
      color: body.color||'#6ea8fe'
    }).eq('id', id);
    return json({ message: '模块已更新' });
  }

  if (req.method === 'DELETE' && id) {
    var result = await supabase.from('modules').delete().eq('id', id).eq('user_id', userId);
    if (!result.error) return json({ message: '模块已删除' });
    return json({ error: '模块不存在或不可删除' }, 404);
  }

  return json({ error: '方法不允许' }, 405);
};
