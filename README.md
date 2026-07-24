# Cap-For-Twikoo | 为 Twikoo 适配的 Cap 人机验证服务 (Vercel 版)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

> 本项目基于 [xyTom/cap-worker](https://github.com/xyTom/cap-worker) 修改，从 Cloudflare Workers 移植到 **Vercel + Neon PostgreSQL**，新增了 `/api/siteverify` 端点以兼容 [Twikoo](https://twikoo.js.org/) 评论系统 v1.7.14+ 的 Cap 验证码官方集成。

---

## 🌐 在线演示

访问 [https://cap.yvyang.top/](https://cap.yvyang.top/) 体验 Cap-For-Twikoo 并查看交互式文档。

---

## 🚀 快速开始

### 一键部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. 点击上方按钮，导入仓库
2. 在 Vercel 中创建 **Neon Postgres** 数据库（Storage → Create → Neon Postgres）
3. 添加环境变量 `CAP_SECRET_KEY`（强随机字符串）
4. 部署完成后，在 Vercel 项目设置中添加自定义域名 `cap.yvyang.top`
5. 在 DNS 解析商添加 CNAME 记录指向 `cname.vercel-dns.com`

### 部署后配置

#### 1. 设置 CAP_SECRET_KEY

在 Vercel 项目 → **Settings → Environment Variables** 中添加：

| Name | Value |
|------|-------|
| `CAP_SECRET_KEY` | 32 位以上随机字符串（如 `openssl rand -hex 32` 生成）|

#### 2. 在 Twikoo 管理面板中配置

登录 Twikoo 管理面板 → **评论管理 → 配置**，添加以下三个环境变量：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `CAPTCHA_PROVIDER` | `Cap` | 启用 Cap 验证码 |
| `CAP_API_ENDPOINT` | `https://cap.yvyang.top/api/` | Cap 服务地址（**末尾必须带 `/api/`**） |
| `CAP_SECRET_KEY` | 与上一步设置的密钥相同 | 用于服务端验证的密钥 |

---

## 📡 API 参考

### 生成挑战

```http
POST /api/challenge
Content-Type: application/json
```

**响应：**
```json
{
  "token": "785975238a3c4f0c1b0c39ed75e6e4cc152436cc0d94363de6",
  "challenge": "{ \"c\": 50, \"s\": 32, \"d\": 4 }",
  "expires": 1753924498818
}
```

### 验证解答

```http
POST /api/redeem
Content-Type: application/json
{
  "token": "c6bd7fd0bea728b5405f0e3637dca6d1b88aaf33589809a103",
  "solutions": [1, 3, 7]
}
```

**响应：**
```json
{
  "success": true,
  "token": "785975238a3c4f0c1b0c39:ed75e6e4cc152436cc0d94363de6"
}
```

### 验证令牌

```http
POST /api/validate
Content-Type: application/json
{
  "token": "785975238a3c4f0c1b0c39:ed75e6e4cc152436cc0d94363de6",
  "keepToken": false
}
```

**响应：**
```json
{
  "success": true
}
```

### ✅ Twikoo siteverify 兼容端点

```http
POST /api/siteverify
Content-Type: application/json
{
  "secret": "your-secret-key",
  "response": "785975238a3c4f0c1b0c39:ed75e6e4cc152436cc0d94363de6"
}
```

---

## 🛠️ 本地开发

```bash
npm install
vercel env pull    # 拉取 Vercel 环境变量
vercel dev         # 启动本地开发服务器
```

---

## 📁 项目结构

```
Cap-For-Twikoo/
├── api/
│   ├── challenge.ts      # POST /api/challenge
│   ├── redeem.ts         # POST /api/redeem
│   ├── validate.ts       # POST /api/validate
│   └── siteverify.ts     # POST /api/siteverify (Twikoo 兼容)
├── lib/
│   ├── cap.ts            # Cap 实例 + Neon 存储钩子
│   └── db.ts             # 数据库连接与建表
├── public/
│   └── index.html        # 文档站点
├── sql/
│   └── init.sql          # 数据库建表 SQL
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

---

## 📄 许可证

本项目基于 MIT License 许可。