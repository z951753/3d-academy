// ============================================================
// 登录 - POST /api/auth/login
// ============================================================
const { getSupabase, getJwtSecret, json, generateToken, hashPassword, auth } = require('../_lib');

module.exports = async function handler(req) {
  if (req.method === 'OPTIONS') return { status: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  if (req.method !== 'POST') return json({ error: '方法不允许' }, 405);

  try {
    var body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    var email = body.email, password = body.password;

    if (!email || !password) return json({ error: '请输入邮箱和密码' }, 400);

    const supabase = getSupabase();
    const jwtSecret = getJwtSecret();

    const { data: user } = await supabase.from('users')
      .select('*').eq('email', email).maybeSingle();

    if (!user) return json({ error: '邮箱或密码错误' }, 401);

    const inputHash = await hashPassword(password, jwtSecret);
    if (inputHash !== user.password_hash) return json({ error: '邮箱或密码错误' }, 401);

    const token = generateToken(user.id);
    return json({
      message: '登录成功',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarColor: user.avatar_color,
        bio: user.bio
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return json({ error: '登录失败: ' + err.message }, 500);
  }
};
