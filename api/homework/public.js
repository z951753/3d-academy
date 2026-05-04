// ============================================================
// 社区广场 - GET /api/homework/public
// 公开查看所有用户的作业，无需登录
// 支持筛选(filter)、搜索(search)、分页(page/pageSize)
// ============================================================
const { getSupabase, json } = require('../_lib');

module.exports = async function handler(req) {
  if (req.method === 'OPTIONS') {
    return { status: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  }
  if (req.method !== 'GET') return json({ error: '方法不允许' }, 405);

  try {
    const url = new URL(req.url || '', 'http://localhost');
    const filter = url.searchParams.get('filter') || 'all';
    const search = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

    const supabase = getSupabase();

    // 查询所有作业 + 关联用户信息
    var query = supabase
      .from('homework')
      .select('*, users!homework_user_id_fkey(id, nickname, email, avatar_color)')
      .order('created_at', { ascending: false });

    // 服务端筛选
    if (filter !== 'all') query = query.eq('status', filter);

    const { data, error } = await query;

    if (error) {
      console.error('[社区广场] 查询错误:', error);
      return json({ error: '查询失败: ' + error.message }, 500);
    }

    // 格式化：附加作者信息
    var list = (data || []).map(function(row) {
      var user = row.users || {};
      return {
        id: row.id,
        title: row.title,
        subject: row.subject,
        status: row.status,
        deadline: row.deadline || '',
        score: row.score || '',
        desc: row.desc || '',
        date: row.date || '',
        files: (typeof row.files === 'string') ? JSON.parse(row.files) : (row.files || []),
        created_at: row.created_at,
        _authorId: row.user_id,
        _authorNickname: user.nickname || (user.email || '').split('@')[0] || '匿名用户',
        _authorAvatarColor: user.avatar_color || '#6ea8fe',
        _likes: [],
      };
    });

    // 客户端搜索（模糊匹配标题/科目/描述/作者）
    if (search) {
      var kw = search.toLowerCase();
      list = list.filter(function(h) {
        return (h.title + h.subject + (h.desc || '') + h._authorNickname).toLowerCase().includes(kw);
      });
    }

    const total = list.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    var paged = list.slice(start, start + pageSize);

    return json({
      list: paged,
      total: total,
      page: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error('[社区广场] 错误:', err);
    return json({ error: '服务器内部错误: ' + err.message }, 500);
  }
};
