// api/stats.js — 统计 API
import { Store, isConfigured } from '../lib/redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isConfigured()) {
    return res.status(500).json({ error: 'Upstash Redis 未配置' });
  }

  try {
    const { start, end } = req.query;
    const startTime = parseInt(start) || 0;
    const endTime = parseInt(end) || Date.now();
    return res.status(200).json(await Store.stats(startTime, endTime));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
