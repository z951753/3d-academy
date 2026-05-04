// ============================================================
// 用户资料 - GET/PUT /api/user/profile
// ============================================================
const { getSupabase, json, auth } = require('../_lib');

module.exports = async function handler(req) {
  if (req.method === 'OPTIONS') return { status: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };

  var userId = await auth(req);
  if (!userId) return json({ error: '未登录' }, 401);

  const supabase = getSupabase();

  if (req.method === 'GET') {
    const { data: user } = await supabase.from('users')
      .select('id,email,nickname,avatar_color,bio,created_at').eq('id', userId).maybeSingle();
    if (!user) return json({ error: '用户不存在' }, 404);
    return json(user);
  }

  if (req.method === 'PUT') {
    var body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    var updates = {};
    if (body.nickname !== undefined) updates.nickname = body.nickname;
    if (body.avatarColor !== undefined) updates.avatar_color = body.avatarColor;
    if (body.bio !== undefined) updates.bio = body.bio;

    if (Object.keys(updates).length === 0) return json({ error: '没有要更新的字段' }, 400);

    await supabase.from('users').update(updates).eq('id', userId);
    return json({ message: '个人信息已更新' });
  }

  return json({ error: '方法不允许' }, 405);
};
