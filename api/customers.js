// api/customers.js — 客户 API
import { Store, isConfigured } from '../lib/redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isConfigured()) {
    return res.status(500).json({ error: 'Upstash Redis 未配置' });
  }

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const { q } = req.query;
      return res.status(200).json(await Store.customers.search(q));
    }

    if (req.method === 'POST') {
      const c = await Store.customers.save(req.body);
      return res.status(201).json(c);
    }

    if (req.method === 'PUT' && id) {
      const c = await Store.customers.save({ ...req.body, id });
      return res.status(200).json(c);
    }

    if (req.method === 'DELETE' && id) {
      await Store.customers.delete(id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
