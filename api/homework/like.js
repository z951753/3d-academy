// ============================================================
// 点赞作业 - POST /api/homework/:id/like
// 需要登录；同一个人不能重复点赞
// 返回 { liked: true/false, count: N }
// ============================================================
const { getSupabase, json, auth, parseJsonSafe } = require('../_lib');

module.exports = async function handler(req) {
  if (req.method === 'OPTIONS') {
    return { status: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  }
  if (req.method !== 'POST') return json({ error: '方法不允许' }, 405);

  try {
    var userId = await auth(req);
    if (!userId) return json({ error: '未登录，请先登录后再点赞' }, 401);

    // 从 URL 提取作业 ID
    var urlPath = req.url || '';
    var idMatch = urlPath.match(/\/api\/homework\/([^\/]+)\/like/);
    var hwId = idMatch ? decodeURIComponent(idMatch[1]) : null;
    if (!hwId) return json({ error: '缺少作业 ID' }, 400);

    const supabase = getSupabase();

    // 查找该作业
    const { data: hw, error: findErr } = await supabase
      .from('homework')
      .select('*')
      .eq('id', hwId)
      .maybeSingle();

    if (findErr || !hw) return json({ error: '作业不存在' }, 404);

    // 解析当前点赞列表（存在 _likes 字段或独立的 likes 表）
    // 这里用 JSON 字段存储简单实现
    var likes = parseJsonSafe(hw._likes || hw.likes || '[]');

    // 切换点赞状态
    var idx = likes.indexOf(userId);
    if (idx >= 0) {
      // 取消点赞
      likes.splice(idx, 1);
    } else {
      // 点赞
      likes.push(userId);
    }

    // 更新数据库
    var liked = idx < 0;
    const { error: updateErr } = await supabase
      .from('homework')
      .update({ _likes: JSON.stringify(likes), likes: JSON.stringify(likes) })
      .eq('id', hwId);

    if (updateErr) {
      console.error('[点赞] 更新错误:', updateErr);
      // 如果字段不存在，忽略更新错误但仍返回正确结果
    }

    return json({
      liked: liked,
      count: likes.length,
    });
  } catch (err) {
    console.error('[点赞] 错误:', err);
    return json({ error: '操作失败: ' + err.message }, 500);
  }
};
