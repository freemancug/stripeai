# StripeAI 开源项目架构设计方案

## 1. 项目定位

StripeAI 是一个面向出海 AI 产品的支付与模型网关后端：

- **AI 中转站**：统一接入 OpenAI、Anthropic 等模型供应商
- **支付中台**：同时支持 Stripe 法币支付与 USDT / USDC 稳定币收款
- **商户基础设施**：为未来扩展订阅、团队配额、代理分销、钱包台账和风控提供基础骨架

## 2. 总体架构

```text
Client / Admin / Merchant Dashboard
                │
                ▼
         API Gateway / Fastify
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
 AI Relay    Billing      Webhooks
 Module      Module       Module
    │           │
    ▼           ├────────────────────────┐
Provider        ▼                        ▼
Adapters     Stripe Service      Stablecoin Service
    │                                  │
    ▼                                  ▼
OpenAI / Anthropic            Ethereum / Tron / Solana / Polygon / BSC
```

## 3. 模块划分

### 3.1 AI Relay 模块

职责：

- 接收统一格式的聊天请求
- 根据 `provider + model` 选择适配器
- 处理 Demo / Live 两种执行模式
- 输出统一响应结构，方便前端和计费系统解耦

关键文件：

- `src/modules/relay/relay.route.ts`
- `src/modules/relay/relay.service.ts`
- `src/modules/providers/provider-registry.ts`

### 3.2 Stripe 支付模块

职责：

- 创建多币种 Checkout Session
- 适配套餐购买、充值包、一次性付款
- 为订单系统提供标准化支付结果

关键文件：

- `src/modules/payments/stripe.service.ts`
- `src/modules/payments/payment.route.ts`

### 3.3 稳定币支付模块

职责：

- 根据链和币种生成支付报价
- 返回收款地址、总金额、确认数和过期时间
- 为后续链上监听和自动对账预留接口

关键文件：

- `src/modules/payments/stablecoin.service.ts`
- `src/modules/payments/payment.schema.ts`

## 4. 推荐数据模型

虽然当前示例未接入数据库，但推荐至少包含以下实体：

- `users`
- `workspaces`
- `api_keys`
- `model_providers`
- `relay_requests`
- `products`
- `orders`
- `payment_intents`
- `crypto_invoices`
- `wallet_addresses`
- `webhook_events`
- `usage_records`

## 5. 推荐订单流

### 5.1 Stripe 支付流

1. 前端创建订单
2. 服务端调用 `/v1/payments/stripe/checkout-sessions`
3. 用户在 Stripe Checkout 完成支付
4. Stripe Webhook 通知系统更新订单状态
5. 账户开通额度 / 套餐 / Token 配额

### 5.2 稳定币支付流

1. 前端创建稳定币订单
2. 服务端生成报价和收款地址
3. 用户链上转账
4. 链上监听服务检测到账和确认数
5. 系统更新订单为 `confirmed`
6. 发放 AI 使用额度或会员权益

## 6. 安全设计

- API Key 不落日志明文
- 模型供应商请求使用服务端中转
- Stripe 密钥仅保留在服务端
- 稳定币收款地址按链隔离
- 所有支付请求都应绑定 `orderId`
- Webhook 事件需要幂等处理
- 后续应增加：
  - 限流
  - 签名校验
  - 风控规则
  - 管理后台审计日志

## 7. 部署建议

### 最小部署

- Node.js API 服务
- Stripe
- RPC / 链监听服务
- PostgreSQL
- Redis

### 生产部署

- API：Fly.io / Render / Railway / Kubernetes
- DB：PostgreSQL
- Cache / Queue：Redis
- Observability：OpenTelemetry + Sentry + Prometheus
- Blob：S3 / R2

## 8. 下一阶段演进路线

### Phase 1

- 完成后台管理和商户控制台
- 增加数据库和订单落库
- 增加 Stripe webhook 与链上回调

### Phase 2

- 增加订阅制、优惠券、发票系统
- 增加钱包地址池和自动归集
- 增加供应商路由策略与失败重试

### Phase 3

- 支持团队席位、渠道代理、分账
- 支持多租户计费和配额管理
- 支持更多稳定币和链
