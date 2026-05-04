// ============================================================
// 作业存储 CRUD - /api/homework & /api/homework/:id
// ============================================================
const { getSupabase, json, makeId, auth, parseJsonSafe } = require('../_lib');

const DEFAULT_HOMEWORK = [
  {title:'Maya 简易杯子建模',subject:'建模',status:'已批改',deadline:'2026-04-20',score:'92',desc:'使用多边形建模工具创建一个杯子模型，要求：1.使用CV曲线+旋转命令 2.杯壁厚度合理 3.提交.ma源文件',date:'2026/4/18'},
  {title:'三点布光渲染练习',subject:'渲染',status:'已提交',deadline:'2026-04-28',score:'',desc:'给给定的场景设置三点布光（主光、辅光、轮廓光），使用Arnold渲染器输出1080p图像，要求明暗层次分明、氛围感强。',date:'2026/4/24'},
  {title:'角色走路循环动画',subject:'动画',status:'进行中',deadline:'2026-05-05',score:'',desc:'制作可循环的角色走路动画，要求：1.至少24帧循环 2.重心有8字形运动 3.手臂有跟随摆动 4.脚不滑动',date:'2026/4/26'},
  {title:'Python脚本：批量重命名',subject:'脚本',status:'未开始',deadline:'2026-05-10',score:'',desc:'编写一个Maya Python脚本，实现批量重命名选中物体功能，要求：1.支持前缀/后缀添加 2.支持序号替换 3.有简单的UI界面',date:'2026/4/27'},
  {title:'道具贴图绘制',subject:'材质',status:'进行中',deadline:'2026-05-03',score:'',desc:'为宝箱模型绘制PBR贴图（BaseColor、Normal、Roughness、Metallic），使用Substance Painter制作，导出4张贴图。',date:'2026/4/25'},
];

async function ensureDefaults(supabase, userId) {
  var { count } = await supabase.from('homework').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  if ((count || 0) > 0) return;
  for (var i = 0; i < DEFAULT_HOMEWORK.length; i++) {
    var h = DEFAULT_HOMEWORK[i];
    await supabase.from('homework').insert([{
      id: makeId('hw'), user_id: userId, title: h.title,
      subject: h.subject, status: h.status, deadline: h.deadline,
      score: h.score, desc: h.desc, date: h.date,
      files: JSON.stringify([]), created_at: new Date().toISOString()
    }]);
  }
}

module.exports = async function handler(req) {
  if (req.method === 'OPTIONS') return { status: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  var userId = await auth(req);
  if (!userId) return json({ error: '未登录' }, 401);

  var urlPath = req.url || '';
  var idMatch = urlPath.match(/\/api\/homework\/([^\/?]+)/);
  var id = idMatch ? decodeURIComponent(idMatch[1]) : null;

  var url = new URL(req.url || '', 'http://localhost');
  var filter = url.searchParams.get('filter') || 'all';
  var search = url.searchParams.get('search') || '';

  const supabase = getSupabase();
  await ensureDefaults(supabase, userId);

  if (req.method === 'GET') {
    var query = supabase.from('homework').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    var { data } = await query;
    var list = (data || []).map(function(row) {
      return { ...row, files: parseJsonSafe(row.files) };
    });
    if (search) {
      var kw = search.toLowerCase();
      list = list.filter(function(h) { return (h.title+h.subject+(h.desc||'')).toLowerCase().includes(kw); });
    }
    return json(list);
  }

  var body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

  if (req.method === 'POST') {
    if (!body.title || !body.subject) return json({ error: '作业名称和科目为必填项' }, 400);
    var newId = makeId('hw');
    await supabase.from('homework').insert([{
      id: newId, user_id: userId, title: body.title,
      subject: body.subject, status: body.status||'未开始',
      deadline: body.deadline||'', score: body.score||'',
      desc: body.desc||'', date: new Date().toLocaleDateString('zh-CN'),
      files: JSON.stringify(body.files||[]), created_at: new Date().toISOString()
    }]);
    // 返回完整对象
    var newItem = {
      id: newId, user_id: userId, title: body.title,
      subject: body.subject, status: body.status||'未开始',
      deadline: body.deadline||'', score: body.score||'',
      desc: body.desc||'', date: new Date().toLocaleDateString('zh-CN'),
      files: body.files||[], created_at: new Date().toISOString()
    };
    return json(newItem, 201);
  }

  if (req.method === 'PUT' && id) {
    await supabase.from('homework').update({
      title: body.title, subject: body.subject,
      status: body.status||'未开始', deadline: body.deadline||'',
      score: body.score||'', desc: body.desc||'',
      files: JSON.stringify(body.files||[])
    }).eq('id', id).eq('user_id', userId);
    // 查询并返回更新后的完整对象
    const { data: updated } = await supabase.from('homework').select('*').eq('id', id).maybeSingle();
    if (updated) {
      updated.files = parseJsonSafe(updated.files);
      return json(updated);
    }
    return json({ message: '作业已更新' });
  }

  if (req.method === 'DELETE' && id) {
    await supabase.from('homework').delete().eq('id', id).eq('user_id', userId);
    return json({ message: '作业已删除' });
  }

  return json({ error: '方法不允许' }, 405);
};
