# StripeAI

一个面向开源场景的 **AI 中转站 + Stripe 多币种支付 + USDT/USDC 稳定币支付** 项目骨架。  
当前仓库提供可直接运行的后端核心实现、接口样例、模块化目录结构和技术架构文档，适合作为 SaaS、AI API 聚合平台、出海产品支付中台的起点。

## 功能范围

- AI 中转站
  - 统一 `/v1/relay/chat/completions` 入口
  - 支持 OpenAI / Anthropic 适配器扩展
  - 标准化请求与响应结构
  - Demo / Live 双模式，便于本地开发
- Stripe 多币种支付
  - 创建 Checkout Session
  - 支持 USD / EUR / GBP / JPY / AUD / CAD / HKD / SGD
  - 适合订阅前的单次支付、充值、套餐购买
- 稳定币支付
  - 支持 USDT / USDC
  - 支持 Ethereum / Tron / Solana / Polygon / BSC
  - 生成支付报价、收款地址、过期时间、确认数要求
- 工程化
  - TypeScript + Fastify
  - 基础测试、构建与类型校验
  - 独立技术文档：`/docs/architecture.md`

## 项目结构

```text
/tmp/workspace/freemancug/stripeai
├── docs/
│   └── architecture.md
├── src/
│   ├── app.ts
│   ├── index.ts
│   ├── config/
│   │   └── env.ts
│   └── modules/
│       ├── health/
│       │   └── health.route.ts
│       ├── payments/
│       │   ├── payment.route.ts
│       │   ├── payment.schema.ts
│       │   ├── stablecoin.service.ts
│       │   └── stripe.service.ts
│       ├── providers/
│       │   └── provider-registry.ts
│       └── relay/
│           ├── relay.route.ts
│           ├── relay.schema.ts
│           └── relay.service.ts
├── tests/
│   └── app.test.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## 核心接口

### 1. 健康检查

```http
GET /health
```

### 2. AI 中转

```http
POST /v1/relay/chat/completions
Content-Type: application/json
Authorization: [required]

{
  "provider": "openai",
  "model": "gpt-4.1",
  "messages": [
    {
      "role": "user",
      "content": "给我生成一个定价页文案"
    }
  ]
}
```

### 3. Stripe 多币种结账

```http
POST /v1/payments/stripe/checkout-sessions
Content-Type: application/json
Authorization: [required]

{
  "productName": "Pro Plan",
  "amount": 29,
  "currency": "usd",
  "quantity": 1,
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

### 4. 稳定币发票

```http
POST /v1/payments/stablecoin/invoices
Content-Type: application/json
Authorization: [required]

{
  "asset": "usdc",
  "chain": "solana",
  "amountUsd": 29,
  "orderId": "order_001"
}
```

## 本地启动

```bash
cd /tmp/workspace/freemancug/stripeai
cp .env.example .env
npm install
npm run dev
```

## 校验命令

```bash
npm run lint
npm run build
npm run test
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `AUTH_REQUIRED` | 是否开启 `/v1/*` 鉴权，默认 `true` |
| `TENANT_API_KEYS` | 多租户 API Key 配置：`apiKey|workspaceId|userId|apiKeyId|rpm|concurrency;...` |
| `DEFAULT_TENANT_RPM_LIMIT` | 未显式配置时的租户每分钟请求上限 |
| `DEFAULT_TENANT_CONCURRENCY_LIMIT` | 未显式配置时的租户并发上限 |
| `RELAY_DEMO_MODE` | `true` 时不请求真实模型供应商 |
| `OPENAI_API_KEY` | OpenAI 密钥 |
| `ANTHROPIC_API_KEY` | Anthropic 密钥 |
| `STRIPE_SECRET_KEY` | Stripe 服务端密钥 |
| `STABLECOIN_TREASURY_*` | 各链稳定币收款地址 |

## 多租户隔离能力（当前实现）

- 所有 `/v1/*` 请求默认要求携带 Authorization 头
- API Key 解析后绑定 `workspaceId + userId + apiKeyId`
- 按 `workspaceId` 执行独立 RPM 限流与并发隔离（互不影响）
- 可使用 `GET /v1/auth/me` 验证当前请求身份和配额限制

## 架构文档

- 详细方案见：`/tmp/workspace/freemancug/stripeai/docs/architecture.md`

## 后续建议

- 增加 PostgreSQL + Prisma，落地订单、账单、钱包地址和 webhook 事件
- 为不同模型供应商增加速率限制、配额和计费规则
- 接入链上监听服务，实现稳定币到账确认
- 增加前端控制台、商户后台和管理后台