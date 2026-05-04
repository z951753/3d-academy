// ============================================================
// 3D动画学院 - Vercel API 主路由
// ============================================================
const { json, corsResponse, auth } = require('./_lib');

module.exports = async function handler(req, res) {
  // CORS 预检
  if (req.method === 'OPTIONS') return corsResponse();

  const url = new URL(req.url || '', 'http://localhost');
  
  try {
    // 健康检查
    if (url.pathname === '/api/health') {
      return json({ status: 'ok', time: new Date().toISOString(), provider: 'vercel-supabase' });
    }

    // 路由分发到子目录
    const path = url.pathname.replace('/api/', '');
    
    if (!path || path === '') {
      return json({ message: '3D动画学院 API 运行中', version: '2.0' });
    }
    
    return json({ error: 'API 路由不存在: /api/' + path }, 404);
  } catch (err) {
    console.error('API Error:', err);
    return json({ error: '服务器内部错误', detail: err.message }, 500);
  }
};
