# Cap-For-Vercel 🛡️

> 基于 **Vercel + Neon PostgreSQL** 的 Cap 人机验证服务，为 [Twikoo](https://twikoo.js.org/) 评论系统提供无缝接入

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/qwq-YvYang/Cap-For-Vercel)

---

## 📋 项目简介

**Cap-For-Vercel** 是一个自托管的 Cap 人机验证服务，采用 **SHA-256 工作量证明（PoW）算法** 实现强大的机器人防护，**无需用户交互**，用户在后台自动完成验证。

本项目从 Cloudflare Workers 移植到 **Vercel Serverless + Neon PostgreSQL**，并针对 Twikoo 评论系统做了专门适配：

- 🚀 **零交互验证** — SHA-256 PoW 算法，用户无需点击任何图片或输入字符
- 🔌 **Twikoo 开箱即用** — 新增 `/api/siteverify` 端点，Twikoo v1.7.14+ 直接配置即可
- 🗄️ **数据持久化** — 验证挑战和令牌存储在 Neon PostgreSQL，安全可靠
- 🌐 **全球加速** — Vercel Edge Network + 自定义域名，国内访问友好
- 🔒 **隐私优先** — 无跟踪、无 Cookie、无数据收集
- 💰 **完全免费** — Vercel Hobby 计划 + Neon Free Tier 即可运行

---

## 🚀 一键部署

### 部署步骤

<details open>
<summary><b>📌 第一步：在 Vercel 中创建项目</b></summary>

1. 点击上方 [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/qwq-YvYang/Cap-For-Vercel) 按钮
2. 导入此 GitHub 仓库
3. Vercel 会自动检测项目配置
</details>

<details open>
<summary><b>📌 第二步：创建 Neon 数据库</b></summary>

在 Vercel 项目 Dashboard 中：
1. 进入 **Storage** 选项卡
2. 点击 **Create → Neon Postgres**
3. 选择区域（建议选 **US East**，离 Vercel 函数最近）
4. 创建完成后，`DATABASE_URL` 会自动注入到环境变量中 ✅
</details>

<details open>
<summary><b>📌 第三步：设置 CAP_SECRET_KEY</b></summary>

进入 **Settings → Environment Variables**，添加：

| Name | Value | 说明 |
|------|-------|------|
| `CAP_SECRET_KEY` | `openssl rand -hex 32` 生成的强密钥 | Twikoo 服务端验证密钥 |

```bash
# 生成 32 字节 (64 位十六进制) 强密钥
openssl rand -hex 32
# 示例输出: a7f3c9e1b5d2f8a04c6e3b9d1f7a5c8e2b0d4f6a8c0e2g4i6k8m0o2q4s6u8w
```
</details>

<details open>
<summary><b>📌 第四步：部署并配置自定义域名</b></summary>

1. 点击 **Deploy** 完成部署
2. 在 Vercel 项目 **Settings → Domains** 中添加你的自定义域名（如 `cap.yvyang.top`）
3. 在 DNS 管理中添加 CNAME 记录指向 `cname.vercel-dns.com`
4. 等待 SSL 证书自动签发（约 1-2 分钟）
</details>

---

## 🔌 Twikoo 配置

部署完成后，在 **Twikoo 管理面板 → 评论管理 → 配置** 中添加以下三个环境变量：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `CAPTCHA_PROVIDER` | `Cap` | 启用 Cap 验证码 |
| `CAP_API_ENDPOINT` | `https://你的域名/api/` | **末尾必须带 `/api/`** |
| `CAP_SECRET_KEY` | 与 Vercel 环境变量一致 | 服务端验证密钥 |

> ⚠️ **`CAP_API_ENDPOINT` 末尾必须带 `/api/`**，这是 Cap 官方 widget 的要求。示例：`https://cap.yvyang.top/api/`

### 验证流程

```
用户提交评论
    │
    ▼
① 前端调用 /api/challenge → 获取 PoW 挑战
    │
    ▼
② cap.min.js 在浏览器中计算 SHA-256 工作量证明
    │
    ▼
③ 调用 /api/redeem 提交解答 → 获取验证 token
    │
    ▼
④ token 随评论数据一起提交到 Twikoo 后端
    │
    ▼
⑤ Twikoo 后端调用 /api/siteverify 验证 token
    │
    ▼
⑥ 验证通过 → 评论发布成功 ✅
```

---

## 📡 API 文档

所有 API 端点均支持 CORS，返回 JSON 格式。

### POST `/api/challenge` — 生成挑战

创建新的验证码挑战，供前端 widget 渲染 PoW 计算任务。

**请求体：**

```json
{
  "challengeCount": 50,
  "challengeSize": 32,
  "challengeDifficulty": 4,
  "expiresMs": 600000
}
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `challengeCount` | number | `50` | 挑战数量（计算量） |
| `challengeSize` | number | `32` | 盐值长度（字节） |
| `challengeDifficulty` | number | `4` | 难度（前导零十六进制位数） |
| `expiresMs` | number | `600000` | 过期时间（毫秒，默认 10 分钟） |

**响应：**

```json
{
  "challenge": { "c": 50, "s": 32, "d": 4 },
  "token": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "expires": 1753924498818
}
```

---

### POST `/api/redeem` — 验证解答

验证用户提交的 PoW 解答，成功时返回一次性验证 token。

**请求体：**

```json
{
  "token": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "solutions": [1, 3, 7, 9, 2, 4, 6, 8, 0, ...]
}
```

**成功响应：**

```json
{
  "success": true,
  "token": "a1b2c3d4e5f6a7b8:3e7f2a3b4c5d6e7f8a9b0c1d2e3f4a5b",
  "expires": 1753924498818
}
```

**失败响应：**

```json
{
  "success": false,
  "message": "Challenge invalid or expired"
}
```

---

### POST `/api/validate` — 验证令牌

验证已颁发的 token 有效性，可选择是否消耗该令牌。

**请求体：**

```json
{
  "token": "a1b2c3d4e5f6a7b8:3e7f2a3b4c5d6e7f8a9b0c1d2e3f4a5b",
  "keepToken": false
}
```

**响应：**

```json
{
  "success": true
}
```

---

### POST `/api/siteverify` — Twikoo 兼容端点

完全兼容 Twikoo v1.7.14+ 的 Cap 验证接口规范，由 Twikoo 后端自动调用。

**请求体：**

```json
{
  "secret": "你的 CAP_SECRET_KEY",
  "response": "a1b2c3d4e5f6a7b8:3e7f2a3b4c5d6e7f8a9b0c1d2e3f4a5b"
}
```

**响应：**

```json
{
  "success": true
}
```

> **注意：** `secret` 必须与 Vercel 环境变量 `CAP_SECRET_KEY` 完全一致，否则返回 403。

---

## 🛠️ 本地开发

```bash
# 克隆仓库
git clone https://github.com/qwq-YvYang/Cap-For-Vercel.git
cd Cap-For-Vercel

# 安装依赖
npm install

# 拉取 Vercel 环境变量（需要先登录 Vercel CLI）
vercel env pull

# 启动本地开发服务器（监听 localhost:3000）
vercel dev
```

### 项目结构

```
Cap-For-Vercel/
├── api/                    # Vercel Serverless Functions
│   ├── challenge.js        # POST /api/challenge — 生成挑战
│   ├── redeem.js           # POST /api/redeem — 验证解答
│   ├── validate.js         # POST /api/validate — 验证令牌
│   └── siteverify.js       # POST /api/siteverify — Twikoo 兼容
├── lib/
│   ├── db.js               # Neon 数据库连接与建表
│   └── cap-impl.js         # 🧠 核心 PoW 算法实现（零外部依赖）
├── public/
│   └── index.html          # 交互式文档与演示页面
├── sql/
│   └── init.sql            # 数据库初始化脚本
├── package.json
├── vercel.json
├── .env.example
└── README.md
```

---

## 🧠 算法实现

本项目采用 **纯 JavaScript** 重新实现了 Cap PoW 算法，无需依赖 `@cap.js/server` 包：

| 组件 | 实现方式 | 说明 |
|------|---------|------|
| **SHA-256** | Node.js 内置 `crypto.createHash` | 与原生 `@cap.js/server` 输出完全一致 |
| **FNV-1a 哈希** | 手写实现 | 用于确定性伪随机数生成 |
| **xorshift PRNG** | 手写实现 | 基于 FNV-1a 种子的确定性 PRNG |
| **随机数生成** | `crypto.webcrypto.getRandomValues` | 密码学安全伪随机数生成器 (CSPRNG) |
| **挑战存储** | Neon PostgreSQL | 替代 Cloudflare Durable Objects |
| **令牌存储** | SHA-256 哈希后存库 | 原文不落盘，防数据库泄露 |

### 安全性对比

| 维度 | 原 Cloudflare 版 | 本 Vercel 版 | 结论 |
|------|-----------------|-------------|------|
| PoW 算法 | SHA-256 + 盐值 | SHA-256 + 盐值 | ✅ 相同 |
| 防重放 | 提交后立即删除挑战 | 提交后立即删除挑战 | ✅ 相同 |
| 防令牌二次使用 | siteverify 后删除令牌 | siteverify 后删除令牌 | ✅ 相同 |
| 令牌存储 | SHA-256 哈希后存 DO | SHA-256 哈希后存 Neon | ✅ 相同 |
| 随机数强度 | CSPRNG | CSPRNG | ✅ 相同 |
| 数据持久化 | Durable Object（内存） | Neon PostgreSQL（磁盘） | ✅ 相近 |
| 过期清理 | 自动清理（5 分钟间隔） | 查询时过滤 + 定时清理 | ✅ 相近 |

---

## 🌐 在线演示

访问 [https://cap.yvyang.top/](https://cap.yvyang.top/) 查看交互式 API 文档并体验实际效果。

---

## 📄 许可证

本项目基于 **MIT License** 许可。

---

## 🔗 相关链接

- [在线演示](https://cap.yvyang.top/)
- [GitHub 仓库](https://github.com/qwq-YvYang/Cap-For-Vercel)
- [原项目 xyTom/cap-worker](https://github.com/xyTom/cap-worker)
- [Cap-For-Twikoo (Cloudflare 版)](https://github.com/qwq-YvYang/Cap-For-Twikoo)
- [Twikoo 评论系统](https://twikoo.js.org/)
- [Vercel](https://vercel.com/)
- [Neon PostgreSQL](https://neon.tech/)
- [@cap.js/server](https://www.npmjs.com/package/@cap.js/server)