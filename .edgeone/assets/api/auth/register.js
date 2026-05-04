// ============================================================
// 注册 - POST /api/auth/register
// ============================================================
const { getSupabase, getJwtSecret, json, makeId, generateToken, hashPassword, auth } = require('../_lib');

module.exports = async function handler(req) {
  if (req.method === 'OPTIONS') return { status: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  if (req.method !== 'POST') return json({ error: '方法不允许' }, 405);

  try {
    const userId = await auth(req);
    if (userId) return json({ error: '已登录，无需重复注册' }, 400);

    var body;
    if (typeof req.body === 'string') body = JSON.parse(req.body); else body = req.body || {};
    
    var email = body.email, password = body.password, nickname = body.nickname;

    if (!email || !password || !nickname) return json({ error: '邮箱、密码、昵称均为必填项' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: '邮箱格式不正确' }, 400);
    if (password.length < 6) return json({ error: '密码至少6位' }, 400);

    const supabase = getSupabase();
    const jwtSecret = getJwtSecret();

    // 检查是否已注册
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existing) return json({ error: '该邮箱已被注册' }, 409);

    const passwordHash = await hashPassword(password, jwtSecret);
    const user = {
      id: makeId('user'),
      email: email,
      password_hash: passwordHash,
      nickname: nickname || email.split('@')[0],
      avatar_color: '',
      bio: '',
      created_at: new Date().toISOString(),
    };

    await supabase.from('users').insert([user]);

    // 初始化学习路线
    await supabase.from('roadmap_progress').insert([{
      user_id: user.id,
      checks: JSON.stringify([]),
      updated_at: new Date().toISOString()
    }]);

    const token = generateToken(user.id);
    return json({
      message: '注册成功',
      token: token,
      user: { id: user.id, email: user.email, nickname: user.nickname }
    }, 201);
  } catch (err) {
    console.error('Register error:', err);
    return json({ error: '注册失败: ' + err.message }, 500);
  }
};
