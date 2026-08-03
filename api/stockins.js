// api/stockins.js — 入库记录 API
import { Store, isConfigured } from '../lib/redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isConfigured()) {
    return res.status(500).json({ error: 'Upstash Redis 未配置' });
  }

  try {
    if (req.method === 'GET') {
      const limit = parseInt(req.query.limit) || 50;
      return res.status(200).json(await Store.stockIns.all(limit));
    }

    if (req.method === 'POST') {
      const record = await Store.stockIns.create(req.body);
      return res.status(201).json(record);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
