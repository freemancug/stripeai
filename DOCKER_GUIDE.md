# Docker 部署指南

本项目提供了 Docker 和 Docker Compose 支持，支持快速容器化部署。

## 文件说明

- `Dockerfile` - 生产环境多阶段构建 Dockerfile
- `Dockerfile.dev` - 开发环境 Dockerfile，支持热重载
- `docker-compose.yml` - 生产环境配置
- `docker-compose.dev.yml` - 开发环境配置
- `.dockerignore` - Docker 构建忽略文件列表

## 快速开始

### 方式 1：生产环境启动

```bash
# 使用默认配置启动
docker-compose up --build

# 后台运行
docker-compose up -d --build

# 查看日志
docker-compose logs -f app
```

应用将在 `http://localhost:3000` 启动。

### 方式 2：开发环境启动

支持热重载，编辑源代码会自动重启服务：

```bash
# 启动开发环境
docker-compose -f docker-compose.dev.yml up --build

# 后台运行
docker-compose -f docker-compose.dev.yml up -d --build

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f app
```

## 环境变量配置

### 方式 1：使用 `.env` 文件

创建 `.env` 文件在项目根目录：

```env
PORT=3000
APP_BASE_URL=http://localhost:3000
AUTH_REQUIRED=true
MASTER_API_KEY=your-master-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
STRIPE_SECRET_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
STABLECOIN_TREASURY_ETH=0x...
STABLECOIN_TREASURY_TRON=TR...
STABLECOIN_TREASURY_SOL=...
STABLECOIN_TREASURY_POLYGON=0x...
STABLECOIN_TREASURY_BSC=0x...
```

### 方式 2：命令行指定

```bash
docker-compose up -e PORT=3001 -e AUTH_REQUIRED=false
```

### 方式 3：docker-compose.yml 中编辑

直接编辑 `docker-compose.yml` 或 `docker-compose.dev.yml` 中的 `environment` 部分。

## 常用命令

```bash
# 启动服务
docker-compose up

# 后台启动
docker-compose up -d

# 停止服务
docker-compose down

# 删除容器和卷
docker-compose down -v

# 重建镜像
docker-compose build --no-cache

# 查看容器日志
docker-compose logs app

# 实时查看日志
docker-compose logs -f app

# 进入容器
docker-compose exec app sh

# 运行一次性命令
docker-compose exec app npm run lint
docker-compose exec app npm run test

# 查看服务状态
docker-compose ps
```

## 健康检查

生产环境 Dockerfile 包含了健康检查配置，Docker 会定期检查应用是否运行正常：

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', ...)"
```

查看健康检查状态：

```bash
docker-compose ps
# 或
docker ps
```

## 多容器编排

可以扩展 `docker-compose.yml` 以添加更多服务（如 PostgreSQL、Redis 等）：

```yaml
version: '3.8'

services:
  app:
    # ... 现有配置

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: stripeai
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - stripeai-network

  redis:
    image: redis:7-alpine
    networks:
      - stripeai-network

volumes:
  postgres_data:

networks:
  stripeai-network:
    driver: bridge
```

## 故障排查

### 1. 端口已被占用

```bash
# 修改 docker-compose.yml 中的端口映射
# 或者停止占用该端口的其他容器
docker ps
docker stop <container-id>
```

### 2. 构建失败

```bash
# 查看详细构建日志
docker-compose build --no-cache

# 或查看容器日志
docker-compose logs app
```

### 3. 环境变量未生效

```bash
# 确保 .env 文件存在
ls -la .env

# 重建镜像和容器
docker-compose down
docker-compose up --build
```

### 4. 应用启动失败

```bash
# 查看详细日志
docker-compose logs -f app

# 进入容器调试
docker-compose exec app sh
npm run lint
npm run build
```

## 生产部署建议

1. **使用 Dockerfile 生产配置**，多阶段构建优化镜像大小
2. **配置 HEALTHCHECK**，让容器编排系统监控应用状态
3. **使用 `.env` 文件管理敏感信息**，不要提交到仓库
4. **定期更新基础镜像**，保持安全性
5. **配置日志驱动**，便于日志聚合：

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

6. **使用 Docker Hub 或私有仓库**存储镜像，便于版本管理
7. **配置资源限制**：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## 相关链接

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 官方文档](https://docs.docker.com/compose/)
- [Node.js Docker 最佳实践](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
