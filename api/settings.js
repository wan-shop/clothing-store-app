// api/settings.js — 设置 API
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
      return res.status(200).json(await Store.settings.get());
    }

    if (req.method === 'POST') {
      return res.status(200).json(await Store.settings.save(req.body));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
