# 服装店管理系统

> 扫码入库、出库、营业额统计、库存管理、客户管理
> 支持 20 人云端共享，数据实时同步

## 一键部署

点击下面的按钮，30秒自动部署到 Vercel（免费，不需要信用卡）：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwan-shop%2Fclothing-store-app&stores=%5B%7B%22type%22%3A%22kv%22%7D%5D&project-name=clothing-store&repository-name=clothing-store-app)

> 部署后会自动创建 Upstash Redis 数据库（免费 256MB），无需手动配置。

## 功能

- 📱 扫码入库 / 出库（支持条形码扫描）
- 💰 营业额统计 + 利润分析
- 📦 库存管理 + 低库存预警
- 👥 客户管理 + 消费记录
- 📊 图表报表 + Excel 导出
- ☁️ 云端数据共享（20人同时使用）
- 📲 PWA 安装到手机主屏幕

## 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 前端 | PWA (Vanilla JS + Vite) | 可安装到手机主屏幕 |
| API | Vercel Serverless Functions | 免费部署 |
| 数据库 | Upstash Redis | 免费 256MB |
| 部署 | Vercel | 免费，不需要信用卡 |
