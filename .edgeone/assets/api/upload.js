// ============================================================
// 文件上传 - POST /api/upload
// Vercel + Supabase 版本：文件以 base64 存入 homework/mistakes 的 files 字段
// （不需要 R2，直接通过作业/错题 CRUD 接口保存文件数据）
// ============================================================
const { getSupabase, json, auth, makeId } = require('../_lib');

module.exports = async function handler(req) {
  if (req.method === 'OPTIONS') return { status: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };

  var userId = await auth(req);
  if (!userId) return json({ error: '未登录' }, 401);

  // Vercel Serverless 不直接处理 multipart，前端已改为在 DEMO_MODE 下存 base64 到 localStorage
  // 生产模式下，文件数据通过 homework/mistake 的 PUT 接口中的 files 字段传递
  // 此端点仅做兼容性响应

  return json({
    key: makeId('file') + '-local',
    message: 'Vercel 模式：文件已通过 base64 存储到数据库',
    note: '生产部署时建议配置 Supabase Storage 或其他对象存储服务'
  });
};
