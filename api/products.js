// api/products.js — 商品 API (Vercel Serverless Function)
import { Store, isConfigured } from '../lib/redis.js';

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isConfigured()) {
    return res.status(500).json({ error: 'Upstash Redis 未配置，请点击 Deploy Button 重新部署' });
  }

  const { id } = req.query;

  try {
    // GET /api/products — 列表/搜索
    if (req.method === 'GET' && !id) {
      const { q, category } = req.query;
      const items = await Store.products.search(q, category);
      return res.status(200).json(items);
    }

    // GET /api/products/:id — 详情
    if (req.method === 'GET' && id) {
      const p = await Store.products.findById(id);
      if (!p) return res.status(404).json({ error: '商品不存在' });
      return res.status(200).json(p);
    }

    // POST /api/products — 创建
    if (req.method === 'POST' && !id) {
      const p = await Store.products.save(req.body);
      return res.status(201).json(p);
    }

    // PUT /api/products/:id — 更新
    if (req.method === 'PUT' && id) {
      const p = await Store.products.save({ ...req.body, id });
      return res.status(200).json(p);
    }

    // DELETE /api/products/:id — 删除
    if (req.method === 'DELETE' && id) {
      await Store.products.delete(id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('Products API error:', e);
    return res.status(500).json({ error: e.message });
  }
}
