// ============================================================
// 退出登录 - POST /api/auth/logout
// ============================================================
const { json } = require('../_lib');
module.exports = async function handler(req) {
  if (req.method === 'OPTIONS') return { status: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  return json({ message: '已退出登录' });
};
