// ============================================================
// 错题集 CRUD - /api/mistakes & /api/mistakes/:id
// ============================================================
const { getSupabase, json, makeId, auth, parseJsonSafe } = require('../_lib');

const DEFAULT_MISTAKES = [
  {subject:'建模',question:'Maya中如何给多边形添加倒角？我总是找不到倒角工具在哪里。',wrong:'在Edit Mesh菜单里找了半天没找到，以为是Mesh菜单。',correct:'选择边 → Edit Mesh → Bevel（或按快捷键 Ctrl+B），可在属性面板调节分数和圆度。',note:'记住：倒角在Edit Mesh下，不在Mesh下！快捷键Ctrl+B很好用。',mastered:true,date:'2026/4/20'},
  {subject:'绑定',question:'IK和FK的区别是什么？什么时候该用哪个？',wrong:'觉得IK和FK差不多，随便用一个就行，结果角色走路时脚一直滑动。',correct:'IK（逆向动力学）：拖动控制器自动计算父关节，适合脚踩地面等固定末端场景。\nFK（正向动力学）：手动旋转每个关节，适合挥动手臂等弧线运动。\n角色绑定通常需要IK/FK切换系统。',note:'走路时脚必须用IK！手臂挥动用FK更自然。',mastered:false,date:'2026/4/22'},
  {subject:'渲染',question:'Arnold渲染出来全是噪点怎么办？',wrong:'以为增加分辨率就能减少噪点，渲染了4小时还是满屏噪点。',correct:'增加Camera(AA)采样值（建议3-5），而不是分辨率。同时检查灯光采样、DOF采样设置。可以用Arnold Render View实时预览调参。',note:'分辨率≠采样！Camera AA才是关键，其他采样看场景需要调。',mastered:false,date:'2026/4/25'},
  {subject:'动画',question:'走路循环动画中，角色重心总是上下跳动感不对？',wrong:'只做了腿的前后运动，没有做重心的上下和前后位移，看起来像在地上滑行。',correct:'走路时重心有8字形运动轨迹：\n1.上下：单腿支撑时最高，双腿支撑时最低\n2.前后：脚落地时重心前移，蹬地时后移\n3.左右：单腿支撑时重心向支撑腿偏移',note:'先理解走路的力学原理，再K帧！参考理查德·威廉姆斯的《动画师生存工具箱》。',mastered:false,date:'2026/4/26'},
];

async function ensureDefaults(supabase, userId) {
  var { count } = await supabase.from('mistakes').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  if ((count || 0) > 0) return;
  for (var i = 0; i < DEFAULT_MISTAKES.length; i++) {
    var m = DEFAULT_MISTAKES[i];
    await supabase.from('mistakes').insert([{
      id: makeId('mk'), user_id: userId, subject: m.subject, question: m.question,
      wrong_answer: m.wrong, correct_answer: m.correct, note: m.note,
      mastered: m.mastered ? 1 : 0, date: m.date,
      files: JSON.stringify([]), created_at: new Date().toISOString()
    }]);
  }
}

module.exports = async function handler(req) {
  if (req.method === 'OPTIONS') return { status: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  var userId = await auth(req);
  if (!userId) return json({ error: '未登录' }, 401);

  var urlPath = req.url || '';
  // 匹配 /api/mistakes/:id 和 /api/mistakes/:id/master
  var idMatch = urlPath.match(/\/api\/mistakes\/([^\/?]+)(?:\/(master))?/);
  var id = idMatch ? decodeURIComponent(idMatch[1]) : null;
  var action = idMatch ? idMatch[2] : null;

  var url = new URL(req.url || '', 'http://localhost');
  var filter = url.searchParams.get('filter') || 'all';
  var search = url.searchParams.get('search') || '';

  const supabase = getSupabase();
  await ensureDefaults(supabase, userId);

  if (req.method === 'GET') {
    var query = supabase.from('mistakes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('subject', filter);
    var { data } = await query;
    var list = (data || []).map(function(row) {
      return { ...row, mastered: !!row.mastered, files: parseJsonSafe(row.files) };
    });
    if (search) {
      var kw = search.toLowerCase();
      list = list.filter(function(m) {
        return (m.subject+m.question+(m.wrong_answer||'')+(m.correct_answer||'')+(m.note||'')).toLowerCase().includes(kw);
      });
    }
    return json(list);
  }

  var body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

  if (req.method === 'POST') {
    if (!body.subject || !body.question) return json({ error: '科目和题目描述为必填项' }, 400);
    var newId = makeId('mk');
    await supabase.from('mistakes').insert([{
      id: newId, user_id: userId, subject: body.subject,
      question: body.question, wrong_answer: body.wrong_answer||'',
      correct_answer: body.correct_answer||'', note: body.note||'',
      mastered: 0, date: new Date().toLocaleDateString('zh-CN'),
      files: JSON.stringify(body.files||[]), created_at: new Date().toISOString()
    }]);
    return json({ id: newId, message: '错题添加成功' }, 201);
  }

  if (req.method === 'PUT' && id) {
    await supabase.from('mistakes').update({
      subject: body.subject, question: body.question,
      wrong_answer: body.wrong_answer||'', correct_answer: body.correct_answer||'',
      note: body.note||'', files: JSON.stringify(body.files||[])
    }).eq('id', id).eq('user_id', userId);
    return json({ message: '错题已更新' });
  }

  if (req.method === 'DELETE' && id) {
    await supabase.from('mistakes').delete().eq('id', id).eq('user_id', userId);
    return json({ message: '错题已删除' });
  }

  if (req.method === 'PATCH' && id && action === 'master') {
    var row = await supabase.from('mistakes').select('mastered').eq('id', id).eq('user_id', userId).maybeSingle();
    if (!row.data) return json({ error: '错题不存在' }, 404);
    var newVal = row.data.mastered ? 0 : 1;
    await supabase.from('mistakes').update({ mastered: newVal }).eq('id', id);
    return json({ mastered: !!newVal, message: newVal ? '已标记掌握' : '已取消掌握' });
  }

  return json({ error: '方法不允许' }, 405);
};
