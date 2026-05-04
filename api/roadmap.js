// ============================================================
// 学习路线 - GET/PUT /api/roadmap
// ============================================================
const { getSupabase, json, auth } = require('../_lib');

module.exports = async function handler(req) {
  if (req.method === 'OPTIONS') return { status: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  var userId = await auth(req);
  if (!userId) return json({ error: '未登录' }, 401);

  const supabase = getSupabase();

  if (req.method === 'GET') {
    var { data: row } = await supabase.from('roadmap_progress')
      .select('checks, updated_at').eq('user_id', userId).maybeSingle();
    var checks = [];
    if (row && row.checks) { try { checks = JSON.parse(row.checks); } catch(e) {} }
    if (checks.length < 10) checks = Array(10).fill(false);
    return json({ checks: checks, updatedAt: row ? row.updated_at : null });
  }

  if (req.method === 'PUT') {
    var body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!Array.isArray(body.checks)) return json({ error: 'checks 必须是数组' }, 400);
    var done = body.checks.filter(Boolean).length;
    var pct = Math.round(done / body.checks.length * 100);

    // Upsert
    var existing = await supabase.from('roadmap_progress').select('id').eq('user_id', userId).maybeSingle();
    if (existing.data) {
      await supabase.from('roadmap_progress').update({
        checks: JSON.stringify(body.checks), updated_at: new Date().toISOString()
      }).eq('user_id', userId);
    } else {
      await supabase.from('roadmap_progress').insert([{
        user_id: userId, checks: JSON.stringify(body.checks),
        updated_at: new Date().toISOString()
      }]);
    }

    return json({ checks: body.checks, progress: { done: done, total: body.checks.length, percent: pct } });
  }

  return json({ error: '方法不允许' }, 405);
};
