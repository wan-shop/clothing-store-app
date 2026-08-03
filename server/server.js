// server.js — 服装店管理后端 API
// 支持20人实时共享数据：商品/销售/入库/客户/设置

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ===== 中间件 =====
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 静态文件（前端dist）
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// ===== 数据库初始化 =====
const db = new Database(join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    color TEXT DEFAULT '',
    size TEXT DEFAULT '',
    costPrice REAL DEFAULT 0,
    sellingPrice REAL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    lowStockThreshold INTEGER DEFAULT 5,
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    productId TEXT,
    barcode TEXT,
    productName TEXT,
    quantity INTEGER DEFAULT 1,
    unitPrice REAL DEFAULT 0,
    totalAmount REAL DEFAULT 0,
    costPrice REAL DEFAULT 0,
    grossProfit REAL DEFAULT 0,
    customerId TEXT,
    customerName TEXT DEFAULT '',
    soldAt TEXT
  );

  CREATE TABLE IF NOT EXISTS stockins (
    id TEXT PRIMARY KEY,
    productId TEXT,
    barcode TEXT,
    productName TEXT,
    quantity INTEGER DEFAULT 1,
    costPrice REAL DEFAULT 0,
    supplier TEXT DEFAULT '',
    note TEXT DEFAULT '',
    stockedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    wechat TEXT DEFAULT '',
    gender TEXT DEFAULT '',
    birthday TEXT DEFAULT '',
    note TEXT DEFAULT '',
    totalSpent REAL DEFAULT 0,
    visitCount INTEGER DEFAULT 0,
    createdAt TEXT,
    lastVisitAt TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
  CREATE INDEX IF NOT EXISTS idx_sales_soldAt ON sales(soldAt);
  CREATE INDEX IF NOT EXISTS idx_sales_customerId ON sales(customerId);
  CREATE INDEX IF NOT EXISTS idx_stockins_productId ON stockins(productId);
`);

// 生成ID
function genId() {
  return 'id_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
}

// ===== API 路由 =====

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---------- 商品 ----------
app.get('/api/products', (req, res) => {
  const { q, category } = req.query;
  let sql = 'SELECT * FROM products';
  const params = [];
  const conditions = [];
  if (q) {
    conditions.push('(barcode LIKE ? OR name LIKE ? OR category LIKE ? OR color LIKE ?)');
    const kw = '%' + q + '%';
    params.push(kw, kw, kw, kw);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY updatedAt DESC';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/products/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  res.json(p);
});

app.post('/api/products', (req, res) => {
  const p = req.body;
  const now = new Date().toISOString();
  p.id = p.id || genId();
  p.createdAt = p.createdAt || now;
  p.updatedAt = now;
  db.prepare(`INSERT OR REPLACE INTO products 
    (id, barcode, name, category, color, size, costPrice, sellingPrice, stock, lowStockThreshold, createdAt, updatedAt)
    VALUES (@id, @barcode, @name, @category, @color, @size, @costPrice, @sellingPrice, @stock, @lowStockThreshold, @createdAt, @updatedAt)`
  ).run({
    id: p.id,
    barcode: p.barcode || '',
    name: p.name || '',
    category: p.category || '',
    color: p.color || '',
    size: p.size || '',
    costPrice: p.costPrice || 0,
    sellingPrice: p.sellingPrice || 0,
    stock: p.stock || 0,
    lowStockThreshold: p.lowStockThreshold || 5,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  });
  res.json(p);
});

app.put('/api/products/:id', (req, res) => {
  const p = req.body;
  p.id = req.params.id;
  p.updatedAt = new Date().toISOString();
  db.prepare(`UPDATE products SET
    barcode=@barcode, name=@name, category=@category, color=@color, size=@size,
    costPrice=@costPrice, sellingPrice=@sellingPrice, stock=@stock,
    lowStockThreshold=@lowStockThreshold, updatedAt=@updatedAt
    WHERE id=@id`
  ).run({
    id: p.id,
    barcode: p.barcode || '',
    name: p.name || '',
    category: p.category || '',
    color: p.color || '',
    size: p.size || '',
    costPrice: p.costPrice || 0,
    sellingPrice: p.sellingPrice || 0,
    stock: p.stock || 0,
    lowStockThreshold: p.lowStockThreshold || 5,
    updatedAt: p.updatedAt,
  });
  res.json(p);
});

app.delete('/api/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// 批量入库
app.post('/api/products/:id/stock-in', (req, res) => {
  const { quantity, costPrice } = req.body;
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  p.stock = (p.stock || 0) + quantity;
  p.costPrice = costPrice || p.costPrice;
  p.updatedAt = new Date().toISOString();
  db.prepare('UPDATE products SET stock=?, costPrice=?, updatedAt=? WHERE id=?')
    .run(p.stock, p.costPrice, p.updatedAt, p.id);
  res.json(p);
});

// ---------- 销售 ----------
app.get('/api/sales', (req, res) => {
  const { start, end, customerId } = req.query;
  let sql = 'SELECT * FROM sales';
  const conditions = [];
  const params = [];
  if (start && end) {
    conditions.push('soldAt >= ? AND soldAt <= ?');
    params.push(new Date(parseInt(start)).toISOString(), new Date(parseInt(end)).toISOString());
  }
  if (customerId) {
    conditions.push('customerId = ?');
    params.push(customerId);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY soldAt DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/sales', (req, res) => {
  const { items, customerId, customerName } = req.body;
  const now = new Date().toISOString();
  const created = [];

  const insertSale = db.prepare(`INSERT INTO sales
    (id, productId, barcode, productName, quantity, unitPrice, totalAmount, costPrice, grossProfit, customerId, customerName, soldAt)
    VALUES (@id, @productId, @barcode, @productName, @quantity, @unitPrice, @totalAmount, @costPrice, @grossProfit, @customerId, @customerName, @soldAt)`);

  const reduceStock = db.prepare('UPDATE products SET stock = stock - ?, updatedAt = ? WHERE id = ?');
  const updateCustomer = db.prepare('UPDATE customers SET totalSpent = totalSpent + ?, visitCount = visitCount + 1, lastVisitAt = ? WHERE id = ?');

  const tx = db.transaction(() => {
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
        unitPrice: unitPrice,
        totalAmount: total,
        costPrice: p.costPrice || 0,
        grossProfit: total - cost,
        customerId: customerId || null,
        customerName: customerName || '',
        soldAt: now,
      };
      insertSale.run(sale);
      reduceStock.run(qty, now, p.id);
      if (customerId) updateCustomer.run(total, 1, now, customerId);
      created.push(sale);
    }
  });
  tx();
  res.json(created);
});

// ---------- 入库记录 ----------
app.get('/api/stockins', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(db.prepare('SELECT * FROM stockins ORDER BY stockedAt DESC LIMIT ?').all(limit));
});

app.post('/api/stockins', (req, res) => {
  const r = req.body;
  r.id = genId();
  r.stockedAt = new Date().toISOString();
  db.prepare(`INSERT INTO stockins
    (id, productId, barcode, productName, quantity, costPrice, supplier, note, stockedAt)
    VALUES (@id, @productId, @barcode, @productName, @quantity, @costPrice, @supplier, @note, @stockedAt)`
  ).run({
    id: r.id,
    productId: r.productId || '',
    barcode: r.barcode || '',
    productName: r.productName || '',
    quantity: r.quantity || 0,
    costPrice: r.costPrice || 0,
    supplier: r.supplier || '',
    note: r.note || '',
    stockedAt: r.stockedAt,
  });
  res.json(r);
});

// ---------- 客户 ----------
app.get('/api/customers', (req, res) => {
  const { q } = req.query;
  let sql = 'SELECT * FROM customers';
  const params = [];
  if (q) {
    sql += ' WHERE name LIKE ? OR phone LIKE ? OR wechat LIKE ?';
    const kw = '%' + q + '%';
    params.push(kw, kw, kw);
  }
  sql += ' ORDER BY totalSpent DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/customers', (req, res) => {
  const c = req.body;
  c.id = c.id || genId();
  c.createdAt = c.createdAt || new Date().toISOString();
  db.prepare(`INSERT OR REPLACE INTO customers
    (id, name, phone, wechat, gender, birthday, note, totalSpent, visitCount, createdAt, lastVisitAt)
    VALUES (@id, @name, @phone, @wechat, @gender, @birthday, @note, @totalSpent, @visitCount, @createdAt, @lastVisitAt)`
  ).run({
    id: c.id,
    name: c.name || '',
    phone: c.phone || '',
    wechat: c.wechat || '',
    gender: c.gender || '',
    birthday: c.birthday || '',
    note: c.note || '',
    totalSpent: c.totalSpent || 0,
    visitCount: c.visitCount || 0,
    createdAt: c.createdAt,
    lastVisitAt: c.lastVisitAt || null,
  });
  res.json(c);
});

app.put('/api/customers/:id', (req, res) => {
  const c = req.body;
  c.id = req.params.id;
  db.prepare(`UPDATE customers SET name=@name, phone=@phone, wechat=@wechat, gender=@gender, birthday=@birthday, note=@note WHERE id=@id`).run({
    id: c.id, name: c.name || '', phone: c.phone || '', wechat: c.wechat || '',
    gender: c.gender || '', birthday: c.birthday || '', note: c.note || '',
  });
  res.json(c);
});

app.delete('/api/customers/:id', (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- 设置 ----------
app.get('/api/settings', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'app'").get();
  res.json(row ? JSON.parse(row.value) : {
    storeName: '我的服装店', storePhone: '', storeAddress: '',
    defaultLowStockThreshold: 5, barcodePrefix: 'CL',
  });
});

app.post('/api/settings', (req, res) => {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('app', ?)")
    .run(JSON.stringify(req.body));
  res.json(req.body);
});

// ---------- 统计 ----------
app.get('/api/stats', (req, res) => {
  const { start, end } = req.query;
  const startTime = new Date(parseInt(start)).toISOString();
  const endTime = new Date(parseInt(end)).toISOString();

  const sales = db.prepare('SELECT * FROM sales WHERE soldAt >= ? AND soldAt <= ?').all(startTime, endTime);
  const totalRevenue = sales.reduce((s, x) => s + x.totalAmount, 0);
  const totalProfit = sales.reduce((s, x) => s + x.grossProfit, 0);
  const totalCost = sales.reduce((s, x) => s + x.costPrice * x.quantity, 0);

  const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const totalStock = db.prepare('SELECT COALESCE(SUM(stock),0) as s FROM products').get().s;
  const lowStock = db.prepare('SELECT COUNT(*) as c FROM products WHERE stock <= lowStockThreshold').get().c;
  const customerCount = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;

  // 热门商品
  const topProducts = db.prepare(`
    SELECT productId, barcode, productName as name,
      SUM(quantity) as quantity, SUM(totalAmount) as revenue, SUM(grossProfit) as profit
    FROM sales WHERE soldAt >= ? AND soldAt <= ?
    GROUP BY productId ORDER BY quantity DESC LIMIT 10
  `).all(startTime, endTime);

  res.json({
    totalRevenue, totalProfit, totalCost,
    orderCount: sales.length,
    itemCount: sales.reduce((s, x) => s + x.quantity, 0),
    productCount, totalStock, lowStock, customerCount,
    topProducts,
    recentSales: sales.slice(0, 5),
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`👕 服装店管理后端已启动: http://0.0.0.0:${PORT}`);
});
