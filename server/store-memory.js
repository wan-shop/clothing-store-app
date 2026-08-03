// store-memory.js — 内存数据存储 + GitHub JSON 备份
// 部署到 Render.com 免费版，不需要信用卡，不需要原生模块
// 数据存在内存中（快速），每次变更后异步备份到 GitHub 仓库 JSON 文件

// ===== 内存数据库 =====
const db = {
  products: [],
  sales: [],
  stockIns: [],
  customers: [],
  settings: {
    storeName: '我的服装店', storePhone: '', storeAddress: '',
    defaultLowStockThreshold: 5, currency: '¥', barcodePrefix: 'CL',
  },
};

let loaded = false;
let saveTimer = null;

// ===== GitHub 备份配置 =====
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'wan-shop/clothing-store-app';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const BACKUP_FILE = 'server/data-backup.json';

// ===== 从 GitHub 恢复数据 =====
async function loadFromGitHub() {
  if (!GITHUB_TOKEN) {
    console.log('[备份] 未配置 GITHUB_TOKEN，跳过数据恢复');
    return;
  }
  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${BACKUP_FILE}?ref=${GITHUB_BRANCH}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
      if (content.products) db.products = content.products;
      if (content.sales) db.sales = content.sales;
      if (content.stockIns) db.stockIns = content.stockIns;
      if (content.customers) db.customers = content.customers;
      if (content.settings) db.settings = content.settings;
      console.log(`[备份] 从 GitHub 恢复数据成功: ${db.products.length} 商品, ${db.sales.length} 销售, ${db.customers.length} 客户`);
      db._sha = data.sha; // 保存文件 sha 用于后续更新
    } else if (res.status === 404) {
      console.log('[备份] GitHub 上无备份文件，从空数据开始');
    } else {
      console.log(`[备份] GitHub 恢复失败: ${res.status}`);
    }
  } catch (e) {
    console.error('[备份] 恢复数据出错:', e.message);
  }
  loaded = true;
}

// ===== 保存数据到 GitHub =====
async function saveToGitHub() {
  if (!GITHUB_TOKEN) return; // 未配置 token 时跳过

  const content = Buffer.from(JSON.stringify({
    products: db.products,
    sales: db.sales,
    stockIns: db.stockIns,
    customers: db.customers,
    settings: db.settings,
    savedAt: new Date().toISOString(),
  }, null, 2)).toString('base64');

  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${BACKUP_FILE}?ref=${GITHUB_BRANCH}`;
    const body = {
      message: `auto-backup: ${new Date().toISOString()}`,
      content,
      branch: GITHUB_BRANCH,
    };
    if (db._sha) body.sha = db._sha;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      db._sha = data.content.sha;
      console.log(`[备份] 数据已保存到 GitHub (${db.products.length} 商品, ${db.sales.length} 销售)`);
    } else {
      const err = await res.text();
      console.error(`[备份] 保存到 GitHub 失败: ${res.status}`, err.substring(0, 200));
    }
  } catch (e) {
    console.error('[备份] 保存数据出错:', e.message);
  }
}

// 防抖保存：合并短时间内的多次操作
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveToGitHub();
    saveTimer = null;
  }, 3000); // 3秒后保存
}

// ===== 工具函数 =====
function genId() {
  return 'id_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
}

function now() {
  return new Date().toISOString();
}

// ===== 数据操作 API =====
export const Store = {
  // 初始化
  async init() {
    await loadFromGitHub();
  },

  // 商品
  products: {
    all() {
      return db.products.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },
    findById(id) {
      return db.products.find((p) => p.id === id);
    },
    findByBarcode(barcode) {
      return db.products.find((p) => p.barcode === barcode);
    },
    search(q, category) {
      let result = db.products;
      if (q) {
        const kw = q.toLowerCase();
        result = result.filter((p) =>
          (p.barcode || '').toLowerCase().includes(kw) ||
          (p.name || '').toLowerCase().includes(kw) ||
          (p.category || '').toLowerCase().includes(kw) ||
          (p.color || '').toLowerCase().includes(kw)
        );
      }
      if (category) {
        result = result.filter((p) => p.category === category);
      }
      return result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },
    save(p) {
      const idx = db.products.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        p.updatedAt = now();
        db.products[idx] = { ...db.products[idx], ...p };
      } else {
        p.id = p.id || genId();
        p.createdAt = p.createdAt || now();
        p.updatedAt = now();
        db.products.push(p);
      }
      scheduleSave();
      return p;
    },
    delete(id) {
      db.products = db.products.filter((p) => p.id !== id);
      scheduleSave();
    },
    addStock(id, quantity, costPrice) {
      const p = db.products.find((x) => x.id === id);
      if (p) {
        p.stock = (p.stock || 0) + quantity;
        if (costPrice !== undefined) p.costPrice = costPrice;
        p.updatedAt = now();
        scheduleSave();
      }
      return p;
    },
    reduceStock(id, quantity) {
      const p = db.products.find((x) => x.id === id);
      if (p) {
        p.stock = Math.max(0, (p.stock || 0) - quantity);
        p.updatedAt = now();
        scheduleSave();
      }
      return p;
    },
  },

  // 销售
  sales: {
    all() {
      return db.sales.sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt));
    },
    byDateRange(start, end) {
      return db.sales.filter((s) => {
        const t = new Date(s.soldAt).getTime();
        return t >= start && t <= end;
      });
    },
    byCustomer(customerId) {
      return db.sales.filter((s) => s.customerId === customerId);
    },
    create(items, customerId, customerName) {
      const ts = now();
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
        db.sales.push(sale);
        // 减库存
        Store.products.reduceStock(p.id, qty);
        // 更新客户统计
        if (customerId) {
          const c = db.customers.find((x) => x.id === customerId);
          if (c) {
            c.totalSpent = (c.totalSpent || 0) + total;
            c.visitCount = (c.visitCount || 0) + 1;
            c.lastVisitAt = ts;
          }
        }
        created.push(sale);
      }
      scheduleSave();
      return created;
    },
  },

  // 入库记录
  stockIns: {
    all(limit = 50) {
      return db.stockIns
        .sort((a, b) => new Date(b.stockedAt) - new Date(a.stockedAt))
        .slice(0, limit);
    },
    create(data) {
      const record = {
        id: genId(),
        ...data,
        stockedAt: now(),
      };
      db.stockIns.push(record);
      scheduleSave();
      return record;
    },
  },

  // 客户
  customers: {
    all() {
      return db.customers.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
    },
    findById(id) {
      return db.customers.find((c) => c.id === id);
    },
    search(q) {
      if (!q) return db.customers;
      const kw = q.toLowerCase();
      return db.customers.filter((c) =>
        (c.name || '').toLowerCase().includes(kw) ||
        (c.phone || '').includes(kw) ||
        (c.wechat || '').toLowerCase().includes(kw)
      );
    },
    save(c) {
      const idx = db.customers.findIndex((x) => x.id === c.id);
      if (idx >= 0) {
        db.customers[idx] = { ...db.customers[idx], ...c };
      } else {
        c.id = c.id || genId();
        c.createdAt = c.createdAt || now();
        c.totalSpent = c.totalSpent || 0;
        c.visitCount = c.visitCount || 0;
        db.customers.push(c);
      }
      scheduleSave();
      return c;
    },
    delete(id) {
      db.customers = db.customers.filter((c) => c.id !== id);
      scheduleSave();
    },
  },

  // 设置
  settings: {
    get() {
      return db.settings;
    },
    save(settings) {
      db.settings = settings;
      scheduleSave();
      return settings;
    },
  },

  // 统计
  stats(start, end) {
    const sales = db.sales.filter((s) => {
      const t = new Date(s.soldAt).getTime();
      return t >= start && t <= end;
    });
    const totalRevenue = sales.reduce((s, x) => s + x.totalAmount, 0);
    const totalProfit = sales.reduce((s, x) => s + x.grossProfit, 0);
    const totalCost = sales.reduce((s, x) => s + x.costPrice * x.quantity, 0);

    const productCount = db.products.length;
    const totalStock = db.products.reduce((s, x) => s + (x.stock || 0), 0);
    const lowStock = db.products.filter((p) => (p.stock || 0) <= (p.lowStockThreshold ?? 5)).length;
    const customerCount = db.customers.length;

    // 热门商品
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
      productCount, totalStock, lowStock, customerCount,
      topProducts,
      recentSales: sales.sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt)).slice(0, 5),
    };
  },

  // 原始数据（用于调试）
  raw() {
    return { ...db, _sha: undefined };
  },
};
