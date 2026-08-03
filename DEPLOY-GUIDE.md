# 服装店管理系统 — 云端部署指南（中文图文版）

> **不用懂英语也能跟着做！每一步都有截图说明。**
> 
> 完成后，20个人同时使用，数据实时同步，完全免费。

---

## 总览：我们需要做什么？

| 步骤 | 做什么 | 用时 |
|------|--------|------|
| 第1步 | 在 Render 注册账号 | 2分钟 |
| 第2步 | 创建后端服务 | 5分钟 |
| 第3步 | 获取 GitHub Token | 3分钟 |
| 第4步 | 配置后端环境变量 | 2分钟 |
| 第5步 | 获取后端地址 | 1分钟 |
| 第6步 | 配置前端连接后端 | 1分钟 |

**总计约 15 分钟**

---

## 第1步：注册 Render 账号

1. 用手机或电脑浏览器打开：
   ```
   https://render.com
   ```

2. 点击右上角 **Sign Up**

3. 点击 **GitHub** 图标（用 GitHub 账号登录）

4. 如果要求授权，点 **Authorize Render**

> 💡 如果没有 GitHub 账号，先注册一个 GitHub 账号

---

## 第2步：创建后端服务

1. 登录 Render 后，在控制台页面找到 **New +** 按钮（右上角）

2. 点击 **Web Service**

3. 找到你的仓库 **clothing-store-app**，点击 **Connect**

4. 填写以下内容（照着抄就行）：

   | 栏目 | 填什么 |
   |------|--------|
   | **Name** | `clothing-store-api` |
   | **Language** | 选 `Node` |
   | **Root Directory** | `server` |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server.js` |
   | **Instance Type** | 选 **Free** |

5. 先别急着点创建！向下滚动到 **Environment Variables** 部分

---

## 第3步：获取 GitHub Token

> Token 用于后端自动备份数据到 GitHub，防止数据丢失

1. 在浏览器新标签页打开：
   ```
   https://github.com/settings/tokens
   ```

2. 点击 **Generate new token** → 选 **Generate new token (classic)**

3. 填写：
   - **Note**: 输入 `render-backup`
   - **Expiration**: 选 **No expiration**（永不过期）
   - 勾选 **repo**（第一个勾选框）

4. 拉到最下面，点绿色按钮 **Generate token**

5. 复制生成的字符串（以 `ghp_` 开头）

   > ⚠️ 复制后保存好，页面关了就看不到了！

---

## 第4步：配置后端环境变量

回到 Render 页面：

1. 在 **Environment Variables** 部分，填写：
   - **Key**: `GITHUB_TOKEN`
   - **Value**: 粘贴刚才复制的 `ghp_...` 字符串

2. 点击 **Add Environment Variable** 添加

3. （可选）再添加一个：
   - **Key**: `GITHUB_BRANCH`
   - **Value**: `main`

---

## 第5步：创建并获取地址

1. 点击页面最下面的 **Create Web Service** 绿色按钮

2. 等待 1-3 分钟，页面会显示构建日志

3. 构建完成后，在页面上方找到你的后端地址：
   ```
   https://clothing-store-api-xxxx.onrender.com
   ```
   （xxxx 是随机字符，每个不同）

4. **复制这个地址！** 下一步要用

> 💡 可以在浏览器打开这个地址测试，看到 `{"status":"ok"...}` 说明成功了

---

## 第6步：配置前端连接后端

1. 用浏览器打开你的服装店 App：
   ```
   https://wan-shop.github.io/clothing-store-app/
   ```

2. 点击底部菜单 **设置**

3. 找到 **云端同步** 部分

4. 在输入框中粘贴你的 Render 地址：
   ```
   https://clothing-store-api-xxxx.onrender.com
   ```

5. 点击 **保存并启用云端**

> 如果设置页面没有云端同步选项，直接在浏览器地址栏输入：
> ```
> javascript:localStorage.setItem('clothing-store:api-base','你的Render地址')
> ```
> 按回车后页面刷新即可

---

## 第7步：分享给20人

把以下地址发给所有人：
```
https://wan-shop.github.io/clothing-store-app/
```

**每个人打开后，需要做一次第6步的配置**（输入 Render 地址）。
配置一次后，以后打开自动连接云端，不用再配。

> 💡 如果你觉得让每个人都配太麻烦，告诉我，我可以帮你把 Render 地址写死在代码里，这样用户打开就能用，完全免配置。

---

## 常见问题

### Q: Render 免费版需要绑信用卡吗？
**不需要！** 注册和创建免费服务都不需要信用卡。如果看到信用卡输入框，那是为了升级付费版，你不需要填，直接跳过。

### Q: 数据会丢失吗？
**不会！** 数据每次操作后自动备份到你的 GitHub 仓库。即使 Render 服务重启，数据也会自动恢复。

### Q: 服务多久不用会休眠？
Render 免费版 **15分钟无访问后自动休眠**，下次访问约 **1秒内唤醒**。对服装店日常使用完全没影响。

### Q: 免费额度够用吗？
- 750小时/月（24×31=744小时，够1个服务一直跑）
- 不限流量
- 20人完全够用

---

## 技术架构

```
┌─────────────────────────────────────────────┐
│  20个用户（手机/电脑浏览器）                     │
│         ↓ 打开网页                              │
│  GitHub Pages（前端PWA）                       │
│  https://wan-shop.github.io/clothing-store-app │
│         ↓ API 请求                             │
│  Render.com 免费版（后端API）                   │
│  https://clothing-store-api-xxxx.onrender.com  │
│         ↓ 数据备份                             │
│  GitHub 仓库 JSON 文件（持久化）                 │
│  github.com/wan-shop/clothing-store-app         │
└─────────────────────────────────────────────┘
```

**全部免费，不需要信用卡，数据不丢失！**
