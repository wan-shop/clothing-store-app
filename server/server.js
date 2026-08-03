// server.js — 服装店管理后端 API（内存版）
// 部署到 Render.com 免费版，不需要信用卡，不需要原生模块
// 数据存在内存中（快速），每次变更后异步备份到 GitHub 仓库 JSON 文件
// 启动时自动从 GitHub 恢复数据

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { Store } from './store-memory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ===== 中间件 =====
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ===== 启动时从 GitHub 恢复数据 =====
Store.init().then(() => {
  console.log('[启动] 数据存储初始化完成');
}).catch((e) => {
  console.error('[启动] 数据初始化失败:', e.message);
});

// 静态文件（前端dist）
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// ===== API 路由 =====

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---------- 商品 ----------
app.get('/api/products', (req, res) => {
  const { q, category } = req.query;
  res.json(Store.products.search(q, category));
});

app.get('/api/products/:id', (req, res) => {
  const p = Store.products.findById(req.params.id);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  res.json(p);
});

app.post('/api/products', (req, res) => {
  const p = Store.products.save(req.body);
  res.json(p);
});

app.put('/api/products/:id', (req, res) => {
  const p = { ...req.body, id: req.params.id };
  res.json(Store.products.save(p));
});

app.delete('/api/products/:id', (req, res) => {
  Store.products.delete(req.params.id);
  res.json({ ok: true });
});

// 批量入库
app.post('/api/products/:id/stock-in', (req, res) => {
  const { quantity, costPrice } = req.body;
  const p = Store.products.addStock(req.params.id, quantity, costPrice);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  res.json(p);
});

// ---------- 销售 ----------
app.get('/api/sales', (req, res) => {
  const { start, end, customerId } = req.query;
  let result;
  if (start && end) {
    result = Store.sales.byDateRange(parseInt(start), parseInt(end));
  } else if (customerId) {
    result = Store.sales.byCustomer(customerId);
  } else {
    result = Store.sales.all();
  }
  res.json(result);
});

app.post('/api/sales', (req, res) => {
  const { items, customerId, customerName } = req.body;
  const created = Store.sales.create(items, customerId, customerName);
  res.json(created);
});

// ---------- 入库记录 ----------
app.get('/api/stockins', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(Store.stockIns.all(limit));
});

app.post('/api/stockins', (req, res) => {
  const record = Store.stockIns.create(req.body);
  res.json(record);
});

// ---------- 客户 ----------
app.get('/api/customers', (req, res) => {
  const { q } = req.query;
  res.json(Store.customers.search(q));
});

app.post('/api/customers', (req, res) => {
  const c = Store.customers.save(req.body);
  res.json(c);
});

app.put('/api/customers/:id', (req, res) => {
  const c = { ...req.body, id: req.params.id };
  res.json(Store.customers.save(c));
});

app.delete('/api/customers/:id', (req, res) => {
  Store.customers.delete(req.params.id);
  res.json({ ok: true });
});

// ---------- 设置 ----------
app.get('/api/settings', (req, res) => {
  res.json(Store.settings.get());
});

app.post('/api/settings', (req, res) => {
  res.json(Store.settings.save(req.body));
});

// ---------- 统计 ----------
app.get('/api/stats', (req, res) => {
  const { start, end } = req.query;
  const startTime = parseInt(start) || 0;
  const endTime = parseInt(end) || Date.now();
  res.json(Store.stats(startTime, endTime));
});

// ---------- 数据备份/恢复 ----------
app.get('/api/data', (req, res) => {
  res.json(Store.raw());
});

// SPA fallback（前端路由）
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: '前端文件未构建，请先运行 npm run build' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`👕 服装店管理后端已启动: http://0.0.0.0:${PORT}`);
  console.log(`📊 数据备份: ${process.env.GITHUB_TOKEN ? '已启用(GitHub)' : '未配置(仅内存)'}`);
});
