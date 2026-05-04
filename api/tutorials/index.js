// ============================================================
// 教程 CRUD - /api/tutorials & /api/tutorials/:id
// ============================================================
const { getSupabase, json, makeId, auth } = require('../_lib');

const DEFAULT_TUTORIALS = [
  {title:"Maya 界面与基础操作",cat:"入门",level:"初级",desc:"认识工作区、视图导航、基本工具",link:"#"},
  {title:"多边形建模：道具案例",cat:"建模",level:"初级",desc:"从简单几何体制作低模道具",link:"#"},
  {title:"硬表面建模：机械零件",cat:"建模",level:"中级",desc:"倒角、拓扑技巧，制作精密机械",link:"#"},
  {title:"角色建模：Q版小人",cat:"建模",level:"中级",desc:"从球体组合到完整角色模型",link:"#"},
  {title:"UV展开基础与技巧",cat:"材质",level:"初级",desc:"UV展开原理、接缝摆放和排布优化",link:"#"},
  {title:"PBR材质制作流程",cat:"材质",level:"中级",desc:"Substance Painter联动，写实PBR材质",link:"#"},
  {title:"Arnold材质节点详解",cat:"材质",level:"进阶",desc:"aiStandardSurface节点、SSS皮肤材质",link:"#"},
  {title:"三点布光与灯光类型",cat:"渲染",level:"初级",desc:"主光/辅光/轮廓光，基础布光方法",link:"#"},
  {title:"Arnold渲染器入门",cat:"渲染",level:"中级",desc:"采样设置、AOV分层、渲染优化",link:"#"},
  {title:"HDRI环境光与IBL",cat:"渲染",level:"中级",desc:"HDRI贴图创建逼真环境照明",link:"#"},
  {title:"骨骼系统搭建基础",cat:"绑定",level:"初级",desc:"创建骨骼链、设置层级关系",link:"#"},
  {title:"IK/FK切换与控制器",cat:"绑定",level:"中级",desc:"IK/FK无缝切换、自定义控制器",link:"#"},
  {title:"权重涂抹实战技巧",cat:"绑定",level:"中级",desc:"权重问题解决、镜像权重",link:"#"},
  {title:"关键帧动画基础",cat:"动画",level:"初级",desc:"关键帧设置、图表编辑器、缓动曲线",link:"#"},
  {title:"走路循环动画制作",cat:"动画",level:"中级",desc:"走路力学分析、可循环走路动画",link:"#"},
  {title:"跑步与跳跃动画",cat:"动画",level:"中级",desc:"不同速度下的运动规律和节奏",link:"#"},
  {title:"面部表情与口型同步",cat:"动画",level:"进阶",desc:"BlendShape驱动、唇形同步",link:"#"},
  {title:"nParticle粒子特效",cat:"特效",level:"中级",desc:"火焰、烟雾、魔法粒子效果",link:"#"},
  {title:"nCloth布料模拟",cat:"特效",level:"中级",desc:"角色衣服模拟、布料碰撞",link:"#"},
  {title:"Bifrost流体模拟",cat:"特效",level:"进阶",desc:"液体模拟、泡沫、水花生成",link:"#"},
  {title:"MEL脚本入门",cat:"脚本",level:"中级",desc:"Maya嵌入式语言，自动化操作",link:"#"},
  {title:"Python脚本开发",cat:"脚本",level:"进阶",desc:"maya.cmds API开发自定义工具",link:"#"},
  {title:"镜头语言与运镜",cat:"动画",level:"中级",desc:"推拉摇移、景深控制、镜头节奏",link:"#"},
  {title:"Nuke合成基础",cat:"渲染",level:"进阶",desc:"AOV合成、色彩校正、特效叠加",link:"#"},
];

async function ensureDefaultTuts(supabase, userId) {
  var { count } = await supabase.from('tutorials').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('builtin', 1);
  if ((count || 0) > 0) return;
  for (var i = 0; i < DEFAULT_TUTORIALS.length; i++) {
    var t = DEFAULT_TUTORIALS[i];
    await supabase.from('tutorials').insert([{
      id: makeId('builtin'), user_id: userId, title: t.title,
      cat: t.cat, level: t.level, desc: t.desc, link: t.link,
      builtin: 1, created_at: new Date().toISOString()
    }]);
  }
}

module.exports = async function handler(req) {
  if (req.method === 'OPTIONS') return { status: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  var userId = await auth(req);
  if (!userId) return json({ error: '未登录' }, 401);

  var urlPath = req.url || '';
  var idMatch = urlPath.match(/\/api\/tutorials\/([^\/?]+)/);
  var id = idMatch ? decodeURIComponent(idMatch[1]) : null;

  var url = new URL(req.url || '', 'http://localhost');
  var filter = url.searchParams.get('filter') || 'all';
  var search = url.searchParams.get('search') || '';

  const supabase = getSupabase();
  await ensureDefaultTuts(supabase, userId);

  if (req.method === 'GET') {
    var query = supabase.from('tutorials').select('*').eq('user_id', userId).order('builtin', { ascending: true }).order('created_at', { ascending: false });
    var { data } = await query;
    if (search && data) {
      var kw = search.toLowerCase();
      data = data.filter(function(t) { return (t.title+t.cat+t.level+(t.desc||'')).toLowerCase().includes(kw); });
    }
    if (filter !== 'all' && data) data = data.filter(function(t) { return t.cat === filter; });
    return json(data || []);
  }

  var body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

  if (req.method === 'POST') {
    if (!body.title || !body.cat || !body.level || !body.link) return json({ error: '标题、分类、难度、链接均为必填项' }, 400);
    var newId = makeId('custom');
    await supabase.from('tutorials').insert([{
      id: newId, user_id: userId, title: body.title,
      cat: body.cat, level: body.level, desc: body.desc||'', link: body.link,
      builtin: 0, created_at: new Date().toISOString()
    }]);
    return json({ id: newId, message: '教程添加成功' }, 201);
  }

  if (req.method === 'PUT' && id) {
    await supabase.from('tutorials').update({
      title: body.title, cat: body.cat, level: body.level,
      desc: body.desc||'', link: body.link
    }).eq('id', id).eq('user_id', userId);
    return json({ message: '教程已更新' });
  }

  if (req.method === 'DELETE' && id) {
    await supabase.from('tutorials').delete().eq('id', id).eq('user_id', userId);
    return json({ message: '教程已删除' });
  }

  return json({ error: '方法不允许' }, 405);
};
