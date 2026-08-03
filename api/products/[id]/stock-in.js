// api/products/[id]/stock-in.js — 批量入库
import { Store, isConfigured } from '../../../lib/redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isConfigured()) {
    return res.status(500).json({ error: 'Upstash Redis 未配置' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { quantity, costPrice } = req.body;
    const p = await Store.products.addStock(id, quantity, costPrice);
    if (!p) return res.status(404).json({ error: '商品不存在' });
    return res.status(200).json(p);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
