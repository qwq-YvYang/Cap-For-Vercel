# Cap-For-Twikoo (Vercel 移植版)

将 [Cap-For-Twikoo](https://github.com/qwq-YvYang/Cap-For-Twikoo) 从 Cloudflare Workers 移植到 **Vercel + Neon PostgreSQL**。

## 🚀 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. 点击上方按钮，导入此仓库
2. 在 Vercel 中创建 **Neon Postgres** 数据库（Project Settings → Storage）
3. 添加环境变量 `CAP_SECRET_KEY`（强随机字符串）
4. 部署即可

## ⚙️ 环境变量

| 变量名 | 说明 |
|--------|------|
| `DATABASE_URL` | Vercel 自动注入（Neon 数据库连接串） |
| `CAP_SECRET_KEY` | 用于 Twikoo siteverify 验证的密钥 |

## 🔌 Twikoo 配置

登录 Twikoo 管理面板 → **评论管理 → 配置**：

| 配置项 | 值 |
|--------|-----|
| `CAPTCHA_PROVIDER` | `Cap` |
| `CAP_API_ENDPOINT` | `https://你的域名.vercel.app/api/` |
| `CAP_SECRET_KEY` | 与 `CAP_SECRET_KEY` 环境变量一致 |

## 🛠 本地开发

```bash
npm install
vercel env pull     # 拉取 Vercel 环境变量
vercel dev          # 启动本地开发服务器
