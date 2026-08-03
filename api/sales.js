// api/sales.js — 销售 API
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
      const { start, end, customerId } = req.query;
      let result;
      if (start && end) {
        result = await Store.sales.byDateRange(parseInt(start), parseInt(end));
      } else if (customerId) {
        result = await Store.sales.byCustomer(customerId);
      } else {
        result = await Store.sales.all();
      }
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const { items, customerId, customerName } = req.body;
      const created = await Store.sales.create(items, customerId, customerName);
      return res.status(201).json(created);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
