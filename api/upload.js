// ============================================================
// 文件上传/下载 - POST /api/upload, GET /api/upload/:key
// Vercel + Supabase 版本：文件以 base64 存入 homework/mistakes 的 files 字段
// 支持两种模式：
//   1. POST /api/upload - 接收 base64 文件数据并返回文件元信息
//   2. GET /api/upload/:key - 根据 key 返回文件数据（预留接口）
// ============================================================

const { getSupabase, json, auth, makeId } = require('../_lib');

module.exports = async function handler(req) {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: ''
    };
  }

  var userId = await auth(req);
  if (!userId) return json({ error: '未登录' }, 401);

  // ===== GET: 获取文件（根据 key） =====
  var urlPath = req.url || '';
  var getKeyMatch = urlPath.match(/\/api\/upload\/([^\/\?]+)/);

  if (req.method === 'GET' && getKeyMatch) {
    var fileKey = decodeURIComponent(getKeyMatch[1]);

    try {
      const supabase = getSupabase();

      // 从 homework 表查找文件
      const { data: hwData } = await supabase
        .from('homework')
        .select('files')
        .eq('user_id', userId);

      // 从 mistakes 表查找文件
      const { data: mkData } = await supabase
        .from('mistakes')
        .select('files')
        .eq('user_id', userId);

      // 在所有文件的 files 字段中搜索匹配的 key 或 name
      var allFiles = [];
      (hwData || []).forEach(function(row) {
        try {
          var files = typeof row.files === 'string' ? JSON.parse(row.files) : (row.files || []);
          allFiles = allFiles.concat(files);
        } catch (e) {}
      });

      (mkData || []).forEach(function(row) {
        try {
          var files = typeof row.files === 'string' ? JSON.parse(row.files) : (row.files || []);
          allFiles = allFiles.concat(files);
        } catch (e) {}
      });

      // 查找匹配的文件
      var foundFile = allFiles.find(function(f) {
        return f.key === fileKey || f.name === fileKey;
      });

      if (!foundFile) {
        return json({ error: '文件不存在' }, 404);
      }

      // 如果有 base64 数据，直接返回
      if (foundFile.data) {
        return {
          status: 200,
          headers: {
            'Content-Type': foundFile.type || 'application/octet-stream',
            'Access-Control-Allow-Origin': '*',
          },
          body: foundFile.data.split(',')[1] // 移除 data:mime;base64, 前缀
        };
      }

      // 如果只有 key 没有 data，返回错误
      return json({ error: '文件数据不可用' }, 410);

    } catch (err) {
      console.error('获取文件失败:', err);
      return json({ error: '获取文件失败: ' + err.message }, 500);
    }
  }

  // ===== POST: 上传文件（接收 base64 数据） =====
  if (req.method === 'POST') {
    try {
      var body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      // 支持两种格式：
      // 1. 完整的 base64 文件对象 { name, size, type, data }
      // 2. 简单的文件信息 { name, size, type, data, category, relatedId }

      if (!body.name || !body.type) {
        return json({ error: '缺少文件信息: name 和 type 为必填项' }, 400);
      }

      // 生成唯一标识
      var fileKey = makeId('file') + '-' + (body.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');

      // 构建返回的文件对象（包含原始数据）
      var fileInfo = {
        key: fileKey,
        name: body.name || 'unnamed-file',
        size: body.size || 0,
        type: body.type || 'application/octet-stream',
        data: body.data || null, // base64 数据
        category: body.category || 'general',
        relatedId: body.relatedId || '',
        uploaded_at: new Date().toISOString()
      };

      console.log('[✅] 文件已接收:', fileInfo.name, '(' + fileInfo.type + ')');

      return json(fileInfo, 201);

    } catch (err) {
      console.error('文件上传处理失败:', err);
      return json({ error: '文件上传失败: ' + err.message }, 500);
    }
  }

  return json({ error: '方法不允许' }, 405);
};
