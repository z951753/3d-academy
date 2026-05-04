// ============================================================
// 3D动画学院 - Vercel API 共享工具库
// 数据库: Supabase (PostgreSQL)
// ============================================================

const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取 Supabase 配置
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL 和 SUPABASE_KEY 环境变量未设置');
  return createClient(url, key);
}

// JWT 密钥
function getJwtSecret() {
  return process.env.JWT_SECRET || 'change-this-to-a-random-secret-at-least-32-chars';
}

// ===== 响应工具 =====
function json(data, status = 200) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(data),
  };
}

function corsResponse() {
  return { status: 204, headers: corsHeaders(), body: '' };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// ===== ID 生成器 =====
function makeId(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// ===== 认证系统（简单 Token）=====
function generateToken(userId) {
  const payload = Buffer.from(JSON.stringify({
    uid: userId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    ts: Date.now()
  })).toString('base64');
  return payload;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (!decoded.uid || !decoded.exp) return null;
    if (Date.now() > decoded.exp) return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

async function auth(req) {
  var header = req.headers['authorization'] || req.headers['Authorization'] || '';
  var token = header.replace('Bearer ', '');
  return verifyToken(token);
}

// ===== 密码哈希 =====
async function hashPassword(password, secret) {
  var crypto = require('crypto');
  var data = password + ':' + secret;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ===== 辅助函数 =====
function parseJsonSafe(str) {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return []; }
}

module.exports = {
  getSupabase, getJwtSecret, json, corsResponse, corsHeaders, makeId,
  generateToken, verifyToken, auth, hashPassword, parseJsonSafe
};
