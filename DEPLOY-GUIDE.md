# 服装店管理系统 — 部署指南（超简单版）

> **只需要1个地址，前端+后端+数据库全都有了！**
> 
> 国内国外都能访问，20人共享，完全免费，不需要信用卡。

---

## 为什么 GitHub Pages 打不开？

GitHub Pages (`wan-shop.github.io`) 在中国大陆经常被屏蔽或不稳定，所以打不开。

**解决方案**：把前端+后端一起部署到 **Render.com**，它在国内可以正常访问。

---

## 部署步骤（共3步，约10分钟）

### 第1步：注册 Render 账号（2分钟）

1. 浏览器打开：**https://render.com**
2. 右上角点 **Sign Up**
3. 点 **GitHub** 图标登录
4. 如果要求授权，点 **Authorize Render**

> ⚠️ 如果看到信用卡页面，**不要填**，直接跳过！免费版不需要！

---

### 第2步：创建服务（5分钟）

1. 登录后点 **New +** → **Web Service**

2. 找到 **clothing-store-app** 仓库，点 **Connect**

3. 照着填：

   | 栏目 | 填什么 |
   |------|--------|
   | **Name** | `clothing-store` |
   | **Language** | `Node` |
   | **Root Directory** | （留空，不填） |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `node server/server.js` |
   | **Instance Type** | **Free** |

4. 滚动到 **Environment Variables**，添加：

   | Key | Value |
   |-----|-------|
   | `GITHUB_TOKEN` | 你的 GitHub Token（`ghp_` 开头的） |
   | `GITHUB_REPO` | `wan-shop/clothing-store-app` |
   | `GITHUB_BRANCH` | `main` |

5. 点最下面 **Create Web Service** 绿色按钮

6. 等1-3分钟构建完成

---

### 第3步：获取地址（1分钟）

构建完成后，在页面上方你会看到你的地址：

```
https://clothing-store-xxxx.onrender.com
```

**这就是你唯一的地址！** 打开它就能用，不需要任何配置！

---

## 分享给20人

把这个地址发给所有人：
```
https://clothing-store-xxxx.onrender.com
```

**每个人打开就能直接用，不需要任何配置！**
- 扫码入库 ✅
- 扫码出库 ✅
- 营业额统计 ✅
- 库存管理 ✅
- 客户管理 ✅
- 数据实时同步 ✅

---

## 常见问题

### Q: 真的不需要信用卡吗？
**是的！** Render 免费版完全不需要。如果看到信用卡输入框，那是可选的升级选项，直接跳过。

### Q: 数据会丢吗？
**不会！** 数据每次操作后自动备份到 GitHub 仓库。即使 Render 重启，数据也会自动恢复。

### Q: 15分钟不用会休眠怎么办？
Render 免费版 15分钟无访问后自动休眠，下次访问约1秒唤醒。对服装店日常使用完全无影响——只要你或你的员工在用，就不会休眠。

### Q: 免费额度够20人用吗？
- 750小时/月（24×31=744，够1个服务一直跑）
- 20人共享一个服务，完全够用

---

## 架构图

```
20个用户（手机/电脑）
    ↓ 浏览器打开
Render.com 服务（前端+后端一体）
    ↓ 数据备份
GitHub 仓库（JSON文件，永不丢失）
```

**一个地址，搞定一切！**
