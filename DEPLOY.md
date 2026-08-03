# 服装店管理系统 — 20人云端共享部署指南

## 架构说明

```
20个用户的手机/电脑
       ↓ (浏览器访问)
  GitHub Pages (前端PWA)  ← 免费托管 ✅
       ↓ (API请求)
  Render.com 后端服务     ← 免费版，不需要信用卡 ✅
       ↓ (数据备份)
  GitHub 仓库 JSON 文件    ← 数据持久化，永不丢失 ✅
```

**所有人共享同一套数据**：A入库 → B立即看到 → C扫码销售 → A库存自动减少

---

## 部署步骤（共2步）

### 第一步：部署后端到 Render.com（免费，不需要信用卡）

1. 打开浏览器，访问：**https://render.com**
2. 点击右上角 **Sign Up** → 选择 **GitHub** 登录
3. 授权 Render 访问你的 GitHub
4. 登录后，点击右上角 **New +** → 选择 **Web Service**
5. 选择你的仓库 **clothing-store-app**
6. 填写以下配置：

   | 项目 | 填写内容 |
   |------|----------|
   | Name | `clothing-store-api` |
   | Language | `Node` |
   | Root Directory | `server` |
   | Build Command | `npm install` |
   | Start Command | `node server.js` |
   | Instance Type | **Free** |

7. 向下滚动到 **Environment Variables**，添加：
   - Key: `GITHUB_TOKEN`  
     Value: 你的 GitHub Token（见下方说明）
   
8. 点击最下面的 **Create Web Service** 按钮
9. 等待1-2分钟，部署完成后你会看到一个地址：
   ```
   https://clothing-store-api-xxxx.onrender.com
   ```
   **复制这个地址！** 第二步要用。

#### 如何获取 GitHub Token

1. 打开 https://github.com/settings/tokens
2. 点击 **Generate new token (classic)**
3. Note 填 `render-backup`
4. Expiration 选 **No expiration**
5. 勾选 `repo` 权限（第一个选项）
6. 点最下面绿色按钮 **Generate token**
7. 复制生成的 `ghp_xxxxx...` 字符串

---

### 第二步：配置前端连接后端

把第一步得到的 Render 地址，配置到前端：

1. 用手机或电脑浏览器打开：
   ```
   https://wan-shop.github.io/clothing-store-app/
   ```
2. 点击底部菜单 **设置**
3. 找到 **云端同步** 选项
4. 在输入框中粘贴你的 Render 地址：
   ```
   https://clothing-store-api-xxxx.onrender.com
   ```
5. 点击 **保存并启用云端**

或者直接在浏览器地址栏输入：
```javascript
javascript:localStorage.setItem('clothing-store:api-base','你的Render地址')
```

---

### 第三步：分享给20人

把这个地址发给所有人：
```
https://wan-shop.github.io/clothing-store-app/
```

每个人打开就能用，数据实时同步。

> **注意**：每个人第一次打开后，需要各自配置一次 Render 地址。
> 如果你在代码里写死了地址（我可以帮你做），用户就不需要配置了。

---

## 技术细节

| 组件 | 技术 | 说明 |
|------|------|------|
| 前端 | PWA (Vanilla JS + Vite) | 部署在 GitHub Pages，免费 |
| 后端 | Node.js + Express | 部署在 Render.com 免费版 |
| 数据存储 | 内存 + GitHub JSON备份 | 快速读写 + 持久化备份 |
| API | RESTful JSON | 前后端通过 HTTP API 通信 |
| 同步 | 实时请求 | 每次操作直接写云端 |

### 免费版说明
- Render 免费版：750小时/月，15分钟无访问自动休眠，下次访问1秒唤醒
- 数据每次变更后自动备份到 GitHub 仓库，休眠不丢数据
- GitHub Pages：永久免费，不限流量

### API 接口列表

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET/POST | /api/products | 商品列表/创建 |
| GET/PUT/DELETE | /api/products/:id | 商品详情/修改/删除 |
| POST | /api/products/:id/stock-in | 批量入库 |
| GET/POST | /api/sales | 销售列表/创建销售 |
| GET/POST | /api/stockins | 入库记录 |
| GET/POST/PUT/DELETE | /api/customers | 客户管理 |
| GET/POST | /api/settings | 读取/保存设置 |
| GET | /api/stats | 统计数据（营业额/热门等）|
