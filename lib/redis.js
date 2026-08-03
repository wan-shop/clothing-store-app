// lib/redis.js — Upstash Redis 数据存储
// 用于 Vercel Serverless Functions，数据持久化在 Upstash Redis 中
// 免费版 256MB，不需要信用卡

import { Redis } from '@upstash/redis';

// 从环境变量读取 Upstash Redis 配置
// Vercel Deploy Button 会自动注入这些变量
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const KEY_PREFIX = 'clothing-store:';
const KEYS = {
  products: KEY_PREFIX + 'products',
  sales: KEY_PREFIX + 'sales',
  stockIns: KEY_PREFIX + 'stockIns',
  customers: KEY_PREFIX + 'customers',
  settings: KEY_PREFIX + 'settings',
};

// 检查是否配置了 Redis
function isConfigured() {
  return !!process.env.UPSTASH_REDIS_REST_URL;
}

// 生成 ID
function genId() {
  return 'id_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
}

function now() {
  return new Date().toISOString();
}

// ===== 数据操作 =====
export const Store = {
  // 商品
  products: {
    async all() {
      const data = await redis.get(KEYS.products);
      const items = data || [];
      return items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },
    async findById(id) {
      const items = await this.all();
      return items.find((p) => p.id === id);
    },
    async findByBarcode(barcode) {
      const items = await this.all();
      return items.find((p) => p.barcode === barcode);
    },
    async search(q, category) {
      let items = await this.all();
      if (q) {
        const kw = q.toLowerCase();
        items = items.filter((p) =>
          (p.barcode || '').toLowerCase().includes(kw) ||
          (p.name || '').toLowerCase().includes(kw) ||
          (p.category || '').toLowerCase().includes(kw) ||
          (p.color || '').toLowerCase().includes(kw)
        );
      }
      if (category) {
        items = items.filter((p) => p.category === category);
      }
      return items;
    },
    async save(p) {
      const items = await this.all();
      const idx = items.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        p.updatedAt = now();
        items[idx] = { ...items[idx], ...p };
      } else {
        p.id = p.id || genId();
        p.createdAt = p.createdAt || now();
        p.updatedAt = now();
        items.push(p);
      }
      await redis.set(KEYS.products, items);
      return p;
    },
    async delete(id) {
      const items = await this.all();
      const filtered = items.filter((p) => p.id !== id);
      await redis.set(KEYS.products, filtered);
    },
    async addStock(id, quantity, costPrice) {
      const items = await this.all();
      const p = items.find((x) => x.id === id);
      if (p) {
        p.stock = (p.stock || 0) + quantity;
        if (costPrice !== undefined) p.costPrice = costPrice;
        p.updatedAt = now();
        await redis.set(KEYS.products, items);
      }
      return p;
    },
    async reduceStock(id, quantity) {
      const items = await this.all();
      const p = items.find((x) => x.id === id);
      if (p) {
        p.stock = Math.max(0, (p.stock || 0) - quantity);
        p.updatedAt = now();
        await redis.set(KEYS.products, items);
      }
      return p;
    },
  },

  // 销售
  sales: {
    async all() {
      const data = await redis.get(KEYS.sales);
      return (data || []).sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt));
    },
    async byDateRange(start, end) {
      const all = await this.all();
      return all.filter((s) => {
        const t = new Date(s.soldAt).getTime();
        return t >= start && t <= end;
      });
    },
    async byCustomer(customerId) {
      const all = await this.all();
      return all.filter((s) => s.customerId === customerId);
    },
    async create(items, customerId, customerName) {
      const ts = now();
      const all = await this.all();
      const created = [];
      for (const item of items) {
        const p = item.product;
        const unitPrice = item.unitPrice ?? p.sellingPrice;
        const qty = item.quantity;
        const total = unitPrice * qty;
        const cost = (p.costPrice || 0) * qty;
        const sale = {
          id: genId(),
          productId: p.id,
          barcode: p.barcode,
          productName: p.name,
          quantity: qty,
          unitPrice,
          totalAmount: total,
          costPrice: p.costPrice || 0,
          grossProfit: total - cost,
          customerId: customerId || null,
          customerName: customerName || '',
          soldAt: ts,
        };
        all.push(sale);
        // 减库存
        await Store.products.reduceStock(p.id, qty);
        // 更新客户统计
        if (customerId) {
          const customers = await Store.customers.all();
          const c = customers.find((x) => x.id === customerId);
          if (c) {
            c.totalSpent = (c.totalSpent || 0) + total;
            c.visitCount = (c.visitCount || 0) + 1;
            c.lastVisitAt = ts;
            await redis.set(KEYS.customers, customers);
          }
        }
        created.push(sale);
      }
      await redis.set(KEYS.sales, all);
      return created;
    },
  },

  // 入库记录
  stockIns: {
    async all(limit = 50) {
      const data = await redis.get(KEYS.stockIns);
      return (data || [])
        .sort((a, b) => new Date(b.stockedAt) - new Date(a.stockedAt))
        .slice(0, limit);
    },
    async create(data) {
      const all = (await redis.get(KEYS.stockIns)) || [];
      const record = { id: genId(), ...data, stockedAt: now() };
      all.push(record);
      await redis.set(KEYS.stockIns, all);
      return record;
    },
  },

  // 客户
  customers: {
    async all() {
      const data = await redis.get(KEYS.customers);
      return (data || []).sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
    },
    async findById(id) {
      const all = await this.all();
      return all.find((c) => c.id === id);
    },
    async search(q) {
      const all = await this.all();
      if (!q) return all;
      const kw = q.toLowerCase();
      return all.filter((c) =>
        (c.name || '').toLowerCase().includes(kw) ||
        (c.phone || '').includes(kw) ||
        (c.wechat || '').toLowerCase().includes(kw)
      );
    },
    async save(c) {
      const all = await this.all();
      const idx = all.findIndex((x) => x.id === c.id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...c };
      } else {
        c.id = c.id || genId();
        c.createdAt = c.createdAt || now();
        c.totalSpent = c.totalSpent || 0;
        c.visitCount = c.visitCount || 0;
        all.push(c);
      }
      await redis.set(KEYS.customers, all);
      return c;
    },
    async delete(id) {
      const all = await this.all();
      await redis.set(KEYS.customers, all.filter((c) => c.id !== id));
    },
  },

  // 设置
  settings: {
    async get() {
      const data = await redis.get(KEYS.settings);
      return data || {
        storeName: '我的服装店', storePhone: '', storeAddress: '',
        defaultLowStockThreshold: 5, currency: '¥', barcodePrefix: 'CL',
      };
    },
    async save(settings) {
      await redis.set(KEYS.settings, settings);
      return settings;
    },
  },

  // 统计
  async stats(start, end) {
    const allSales = await this.sales.all();
    const sales = allSales.filter((s) => {
      const t = new Date(s.soldAt).getTime();
      return t >= start && t <= end;
    });
    const totalRevenue = sales.reduce((s, x) => s + x.totalAmount, 0);
    const totalProfit = sales.reduce((s, x) => s + x.grossProfit, 0);
    const totalCost = sales.reduce((s, x) => s + x.costPrice * x.quantity, 0);

    const products = await this.products.all();
    const customers = await this.customers.all();

    const map = {};
    for (const s of sales) {
      if (!map[s.productId]) {
        map[s.productId] = { productId: s.productId, barcode: s.barcode, name: s.productName, quantity: 0, revenue: 0, profit: 0 };
      }
      map[s.productId].quantity += s.quantity;
      map[s.productId].revenue += s.totalAmount;
      map[s.productId].profit += s.grossProfit;
    }
    const topProducts = Object.values(map).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

    return {
      totalRevenue, totalProfit, totalCost,
      orderCount: sales.length,
      itemCount: sales.reduce((s, x) => s + x.quantity, 0),
      productCount: products.length,
      totalStock: products.reduce((s, x) => s + (x.stock || 0), 0),
      lowStock: products.filter((p) => (p.stock || 0) <= (p.lowStockThreshold ?? 5)).length,
      customerCount: customers.length,
      topProducts,
      recentSales: sales.sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt)).slice(0, 5),
    };
  },
};

export { isConfigured };
